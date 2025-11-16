// script.js
// Multi-step signup behaviour
// - No auto-advance: user must click Next
// - Final step shows alert (demo)
// - State saved in localStorage

(function () {
  // run when DOM ready
  document.addEventListener('DOMContentLoaded', () => {

    const STEPS = [
      { id:1, title:'What are you looking for help with?', type:'single', choices:['Retirement Planning','Tax Strategy','Estate Planning','Other'] },
      { id:2, title:'What is your investment goal?', type:'single', choices:['Retirement','Growth','Preservation','Income'] },
      { id:3, title:'How experienced are you with investing?', type:'single', choices:['Beginner','Intermediate','Advanced'] },
      { id:4, title:'Which services interest you?', type:'multi', choices:['Financial Planning','Tax Advice','Estate Advice','Insurance'] },
      { id:5, title:'Choose preferred advisor style', type:'single', choices:['Hands-on','Hands-off','Hybrid'] },
      { id:6, title:'Almost there!', type:'form', fields:['fullname','email','phone'] }
    ];

    const TOTAL = STEPS.length;
    let step = 1;
    const stateKey = 'finwise_wp_final_v1';

    // load saved state (if any)
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(stateKey) || '{}') } catch(e){ saved = {}; }
    let answers = saved.answers || {};
    let formValues = saved.form || {};

    // DOM refs (guarded)
    const dynamicArea = document.getElementById('dynamicArea');
    const stepNumEl = document.getElementById('stepNum');
    const progressEls = Array.from(document.querySelectorAll('.step-line'));
    const nextBtn = document.getElementById('nextBtn');
    const stepTitleEl = document.getElementById('stepTitle');

    // If required DOM nodes are missing, abort gracefully
    if(!dynamicArea || !stepNumEl || !nextBtn || !stepTitleEl){
      // nothing to do
      console.warn('Required DOM nodes not found. script.js aborted.');
      return;
    }

    // util: save
    function saveState(){
      try {
        localStorage.setItem(stateKey, JSON.stringify({ answers, form: formValues }));
      } catch(e) {
        // ignore quota errors
        console.warn('Could not save state', e);
      }
    }

    // render progress
    function renderProgress(){
      stepNumEl.textContent = step;
      progressEls.forEach(el => {
        const idx = Number(el.dataset.index) || 0;
        el.classList.toggle('active', idx <= step);
      });
    }

    // Build options (single / multi) — no auto-advance
    function buildOptions(choices, type, preselected){
      const wrapper = document.createElement('div');
      wrapper.className = 'options';

      choices.forEach((c) => {
        const label = document.createElement('label');
        label.className = 'opt';
        label.tabIndex = 0;

        const box = document.createElement('span');
        box.className = 'box';

        const text = document.createElement('div');
        text.textContent = c;

        // mark selected if preselected
        const isSelected = (type === 'multi' ? (preselected || []).includes(c) : preselected === c);
        if(isSelected){
          box.style.borderColor = 'var(--brand)';
          box.style.background = 'linear-gradient(180deg,#fff,#fff)';
        }

        label.appendChild(box);
        label.appendChild(text);

        // click handler
        label.addEventListener('click', () => {
          if(type === 'single'){
            answers[step] = c;
            // visual update: reset all boxes
            wrapper.querySelectorAll('.box').forEach(b => {
              b.style.borderColor = '#e6e6e6';
              b.style.background = 'white';
            });
            box.style.borderColor = 'var(--brand)';
            box.style.background = 'linear-gradient(180deg,#fff,#fff)';
            nextBtn.disabled = false;
          } else { // multi
            const arr = Array.isArray(answers[step]) ? answers[step] : [];
            const pos = arr.indexOf(c);
            if(pos === -1){
              arr.push(c);
              box.style.borderColor = 'var(--brand)';
              box.style.background = 'linear-gradient(180deg,#fff,#fff)';
            } else {
              arr.splice(pos, 1);
              box.style.borderColor = '#e6e6e6';
              box.style.background = 'white';
            }
            answers[step] = arr;
            nextBtn.disabled = !(answers[step] && answers[step].length > 0);
          }
          saveState();
        });

        // keyboard support
        label.addEventListener('keydown', (e) => {
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            label.click();
          }
        });

        wrapper.appendChild(label);
      });

      return wrapper;
    }

    // render a step
    function renderStep(){
      const s = STEPS.find(x => x.id === step);
      if(!s) return;

      stepTitleEl.textContent = s.title || '';
      dynamicArea.innerHTML = '';
      nextBtn.disabled = true; // default disabled

      if(s.type === 'single' || s.type === 'multi'){
        const q = document.createElement('div');
        q.className = 'question';
        q.textContent = s.title;
        dynamicArea.appendChild(q);

        const selected = answers[step] || (s.type === 'multi' ? [] : null);
        const opts = buildOptions(s.choices, s.type, selected);
        dynamicArea.appendChild(opts);

        // if user already had selection, enable Next
        if(s.type === 'single' && answers[step]) nextBtn.disabled = false;
        if(s.type === 'multi' && answers[step] && answers[step].length > 0) nextBtn.disabled = false;

        nextBtn.textContent = 'Next';
      } else if(s.type === 'form'){
        const container = document.createElement('div');
        container.className = 'right-form';

        s.fields.forEach(f => {
          const wrap = document.createElement('div');
          wrap.style.marginBottom = '12px';

          const label = document.createElement('label');
          label.className = 'text-sm';
          label.textContent = (f === 'fullname' ? 'Full Name' : (f === 'email' ? 'Email Address' : 'Phone Number'));

          const input = document.createElement('input');
          input.className = 'mt-2 w-full border rounded-md p-3 text-sm';
          input.placeholder = f === 'fullname' ? 'John Doe' : (f === 'email' ? 'johndoe@gmail.com' : 'Enter phone number');
          input.value = formValues[f] || '';
          input.id = 'field-' + f;

          input.addEventListener('input', (e) => {
            formValues[f] = e.target.value;
            saveState();
            validateFormLive();
          });

          const err = document.createElement('p');
          err.className = 'text-xs text-red-600 mt-1';
          err.style.display = 'none';
          err.id = 'err-' + f;
          err.textContent = 'Required';

          wrap.appendChild(label);
          wrap.appendChild(input);
          wrap.appendChild(err);
          container.appendChild(wrap);
        });

        dynamicArea.appendChild(container);
        nextBtn.textContent = 'Find My Adviser';
        validateFormLive();
      }

      renderProgress();
    }

    // simple live validation for final form
    function validateFormLive(){
      const name = (document.getElementById('field-fullname') || {}).value || '';
      const mail = (document.getElementById('field-email') || {}).value || '';
      const ph = (document.getElementById('field-phone') || {}).value || '';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      nextBtn.disabled = !(name.trim() && re.test(mail.trim()) && ph.trim());
    }

    // Next button logic
    function handleNext(){
      const s = STEPS.find(x => x.id === step);
      if(!s) return;

      if(s.type === 'single'){
        if(!answers[step]) return alert('Please select an option to continue.');
        step++;
        renderStep();
      } else if(s.type === 'multi'){
        if(!(answers[step] && answers[step].length > 0)) return alert('Please select at least one option.');
        step++;
        renderStep();
      } else if(s.type === 'form'){
        const name = (document.getElementById('field-fullname') || {}).value || '';
        const mail = (document.getElementById('field-email') || {}).value || '';
        const ph = (document.getElementById('field-phone') || {}).value || '';
        let ok = true;

        if(!name.trim()){
          const el = document.getElementById('err-fullname'); if(el) el.style.display = 'block';
          ok = false;
        } else {
          const el = document.getElementById('err-fullname'); if(el) el.style.display = 'none';
        }

        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!re.test(mail.trim())){
          const el = document.getElementById('err-email'); if(el) el.style.display = 'block';
          ok = false;
        } else {
          const el = document.getElementById('err-email'); if(el) el.style.display = 'none';
        }

        if(!ph.trim()){
          const el = document.getElementById('err-phone'); if(el) el.style.display = 'block';
          ok = false;
        } else {
          const el = document.getElementById('err-phone'); if(el) el.style.display = 'none';
        }

        if(!ok) return;

        formValues = { fullname: name.trim(), email: mail.trim(), phone: ph.trim() };
        saveState();

        // demo alert (as requested)
        alert('Demo submit — thank you!\nName: ' + formValues.fullname + '\nEmail: ' + formValues.email);

        // reset or keep? we'll reset to step 1
        step = 1;
        answers = {};
        formValues = {};
        saveState();
        renderStep();
      }
    }

    // prev step
    function prevStep(){
      if(step > 1){
        step--;
        renderStep();
      }
    }

    // attach global handlers
    nextBtn.addEventListener('click', handleNext);

    // progress click (jump) — optional
    progressEls.forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.index) || 1;
        step = idx;
        renderStep();
      });
    });

    // initialize: if saved answers exist, jump to next unanswered step
    if(Object.keys(answers).length){
      const nums = Object.keys(answers).map(n => Number(n)).filter(Boolean);
      if(nums.length) {
        const last = Math.max(...nums);
        step = Math.min(last + 1, TOTAL);
      }
    }

    // initial render
    renderStep();

    // expose prevStep globally because HTML calls onclick="prevStep()"
    window.prevStep = prevStep;
  });
})();
