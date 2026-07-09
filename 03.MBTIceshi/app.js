// ============================================================
// MBTI 16型人格测试 — 核心逻辑
// ============================================================

(function() {
  'use strict';

  // ==================== 状态管理 ====================
  const state = {
    currentPage: 'welcome',   // 'welcome' | 'quiz' | 'result'
    currentQuestion: 0,       // 当前题目索引 (0-92)
    answers: new Array(93).fill(null), // 用户答案: 'A' | 'B' | null
    resultType: null          // 结果类型, 如 'INFJ'
  };

  // ==================== DOM 引用 ====================
  const DOM = {
    // 页面
    pageWelcome: document.getElementById('page-welcome'),
    pageQuiz: document.getElementById('page-quiz'),
    pageResult: document.getElementById('page-result'),

    // 首页
    btnStart: document.getElementById('btn-start'),

    // 答题页
    btnBack: document.getElementById('btn-back'),
    progressText: document.getElementById('progress-text'),
    progressFill: document.getElementById('progress-fill'),
    questionNum: document.getElementById('question-num'),
    questionDim: document.getElementById('question-dim'),
    questionText: document.getElementById('question-text'),
    optionTextA: document.getElementById('option-text-A'),
    optionTextB: document.getElementById('option-text-B'),
    btnOptionA: document.getElementById('btn-option-A'),
    btnOptionB: document.getElementById('btn-option-B'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnSubmit: document.getElementById('btn-submit'),

    // 结果页
    resultContent: document.getElementById('result-content'),

    // 加载层
    loadingOverlay: document.getElementById('loading-overlay')
  };

  // ==================== 页面切换 ====================
  function switchPage(pageName) {
    // 先移除所有 active
    [DOM.pageWelcome, DOM.pageQuiz, DOM.pageResult].forEach(p => {
      if (p) p.classList.remove('active');
    });

    // 设置目标页面
    const pageMap = {
      welcome: DOM.pageWelcome,
      quiz: DOM.pageQuiz,
      result: DOM.pageResult
    };

    const target = pageMap[pageName];
    if (target) {
      // 强制回流以重新触发动画
      void target.offsetWidth;
      target.classList.add('active');
      target.scrollTop = 0;
    }

    state.currentPage = pageName;
  }

  // ==================== 显示加载 ====================
  function showLoading() {
    DOM.loadingOverlay.classList.add('show');
  }

  function hideLoading() {
    DOM.loadingOverlay.classList.remove('show');
  }

  // ==================== 渲染题目 ====================
  function renderQuestion() {
    const q = questions[state.currentQuestion];
    const idx = state.currentQuestion;

    // 更新进度条
    DOM.progressText.textContent = `第 ${idx + 1}/${questions.length} 题`;
    DOM.progressFill.style.width = ((idx + 1) / questions.length * 100).toFixed(2) + '%';

    // 更新题目
    DOM.questionNum.textContent = `第 ${idx + 1}/${questions.length} 题`;
    DOM.questionDim.textContent = dimLabel(q.dimension);
    DOM.questionText.textContent = q.text;
    DOM.optionTextA.textContent = q.options.A;
    DOM.optionTextB.textContent = q.options.B;

    // 清除选中状态
    DOM.btnOptionA.classList.remove('selected');
    DOM.btnOptionB.classList.remove('selected');

    // 恢复之前的答案
    if (state.answers[idx] === 'A') {
      DOM.btnOptionA.classList.add('selected');
    } else if (state.answers[idx] === 'B') {
      DOM.btnOptionB.classList.add('selected');
    }

    // 更新按钮状态
    updateNavButtons();

    // 题目卡片重新播放动画
    const card = document.querySelector('.quiz-card');
    if (card) {
      card.style.animation = 'none';
      void card.offsetWidth;
      card.style.animation = '';
    }
  }

  function dimLabel(dimension) {
    const map = {
      EI: 'E/I 维度',
      SN: 'S/N 维度',
      TF: 'T/F 维度',
      JP: 'J/P 维度'
    };
    return map[dimension] || dimension;
  }

  function updateNavButtons() {
    const idx = state.currentQuestion;
    const isFirst = idx === 0;
    const isLast = idx === questions.length - 1;

    // 上一题
    DOM.btnPrev.disabled = isFirst;

    // 下一题 / 提交
    if (isLast) {
      DOM.btnNext.style.display = 'none';
      DOM.btnSubmit.style.display = 'inline-flex';
      // 检查是否所有题目都已回答
      const allAnswered = state.answers.every(a => a !== null);
      DOM.btnSubmit.disabled = !allAnswered;
      DOM.btnSubmit.textContent = allAnswered ? '查看结果' : '请完成所有题目';
    } else {
      DOM.btnNext.style.display = 'inline-flex';
      DOM.btnSubmit.style.display = 'none';
    }
  }

  // ==================== 选择答案 ====================
  function selectAnswer(option) {
    state.answers[state.currentQuestion] = option;
    DOM.btnOptionA.classList.toggle('selected', option === 'A');
    DOM.btnOptionB.classList.toggle('selected', option === 'B');
    updateNavButtons();

    // 选择后自动跳下一题（小延迟让用户看到选中效果）
    if (state.currentQuestion < questions.length - 1) {
      setTimeout(() => {
        if (state.currentPage === 'quiz') {
          state.currentQuestion++;
          renderQuestion();
        }
      }, 300);
    }
  }

  // ==================== 上一题/下一题 ====================
  function goPrev() {
    if (state.currentQuestion > 0) {
      state.currentQuestion--;
      renderQuestion();
    }
  }

  function goNext() {
    if (state.currentQuestion < questions.length - 1) {
      state.currentQuestion++;
      renderQuestion();
    }
  }

  // ==================== 计分算法 ====================
  function calculateResult() {
    // 初始化计数器
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    // 统计每个维度的答案
    for (let i = 0; i < state.answers.length; i++) {
      const answer = state.answers[i];
      const question = questions[i];
      if (answer && question.mapping[answer]) {
        const trait = question.mapping[answer];
        scores[trait]++;
      }
    }

    // 计算百分比并确定类型
    function calcPct(a, b) {
      const total = scores[a] + scores[b];
      if (total === 0) return { left: 50, right: 50, result: a }; // 平局取前者
      const pctA = Math.round((scores[a] / total) * 100);
      const pctB = 100 - pctA;
      return {
        left: pctA,
        right: pctB,
        result: pctA >= pctB ? a : b
      };
    }

    const ei = calcPct('E', 'I');
    const sn = calcPct('S', 'N');
    const tf = calcPct('T', 'F');
    const jp = calcPct('J', 'P');

    const typeCode = ei.result + sn.result + tf.result + jp.result;

    return {
      type: typeCode,
      dimensions: [
        { labelA: 'E', labelB: 'I', pctA: ei.left, pctB: ei.right, active: ei.result },
        { labelA: 'S', labelB: 'N', pctA: sn.left, pctB: sn.right, active: sn.result },
        { labelA: 'T', labelB: 'F', pctA: tf.left, pctB: tf.right, active: tf.result },
        { labelA: 'J', labelB: 'P', pctA: jp.left, pctB: jp.right, active: jp.result }
      ]
    };
  }

  // ==================== 渲染结果 ====================
  function renderResult(calcResult) {
    const typeData = results[calcResult.type];
    if (!typeData) return;

    state.resultType = calcResult.type;

    let dimsHTML = '';
    calcResult.dimensions.forEach(dim => {
      dimsHTML += `
        <div class="dim-item">
          <div class="dim-labels">
            <span class="dim-label${dim.active === dim.labelA ? ' dim-active' : ''}">${dim.labelA}</span>
            <span class="dim-sep">/</span>
            <span class="dim-label${dim.active === dim.labelB ? ' dim-active' : ''}">${dim.labelB}</span>
          </div>
          <div class="dim-bar-wrap">
            <span class="dim-pct${dim.active === dim.labelA ? ' dim-active' : ''}">${dim.pctA}%</span>
            <div class="dim-bar-track">
              <div class="dim-bar-fill" style="width:${dim.pctA}%;"></div>
            </div>
            <span class="dim-pct${dim.active === dim.labelB ? ' dim-active' : ''}">${dim.pctB}%</span>
          </div>
        </div>
      `;
    });

    // 标签
    const strengths = typeData.strengths.map(s => `<span class="tag tag-good">${s}</span>`).join('');
    const weaknesses = typeData.weaknesses.map(w => `<span class="tag tag-bad">${w}</span>`).join('');
    const careers = typeData.careers.map(c => `<span class="tag tag-career">${c}</span>`).join('');

    DOM.resultContent.innerHTML = `
      <!-- 结果头部 -->
      <div class="result-header">
        <div class="result-type">${calcResult.type}</div>
        <div class="result-name">${typeData.name}</div>
        <div class="result-title">${typeData.title}</div>
      </div>

      <!-- 性格描述 -->
      <div class="result-card">
        <h3>📖 性格概述</h3>
        <p>${typeData.description}</p>
      </div>

      <!-- 维度分布 -->
      <div class="result-card">
        <h3>📊 维度倾向分布</h3>
        <div class="dimensions">
          ${dimsHTML}
        </div>
      </div>

      <!-- 优点 -->
      <div class="result-card">
        <h3>✨ 性格优势</h3>
        <div class="tag-list">${strengths}</div>
      </div>

      <!-- 缺点 -->
      <div class="result-card">
        <h3>🔍 需要成长的地方</h3>
        <div class="tag-list">${weaknesses}</div>
      </div>

      <!-- 适合职业 -->
      <div class="result-card">
        <h3>💼 适合的职业方向</h3>
        <div class="tag-list">${careers}</div>
      </div>

      <!-- 重新测试 -->
      <div class="result-retake">
        <button id="btn-retake" class="btn-primary">重新测试</button>
      </div>
    `;

    // 绑定重新测试按钮
    document.getElementById('btn-retake').addEventListener('click', resetTest);
  }

  // ==================== 提交测试 ====================
  function submitTest() {
    const allAnswered = state.answers.every(a => a !== null);
    if (!allAnswered) {
      shakeElement(DOM.btnSubmit);
      return;
    }

    showLoading();

    // 模拟短暂延迟让加载动画可见
    setTimeout(() => {
      const calcResult = calculateResult();
      renderResult(calcResult);
      hideLoading();
      switchPage('result');
    }, 800);
  }

  // 抖动动画（未完成所有题目时提示）
  function shakeElement(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 400);
  }

  // ==================== 重新测试 ====================
  function resetTest() {
    state.answers = new Array(93).fill(null);
    state.currentQuestion = 0;
    state.resultType = null;
    switchPage('welcome');
  }

  // ==================== 事件绑定 ====================
  function bindEvents() {
    // 首页：开始测试
    DOM.btnStart.addEventListener('click', () => {
      state.currentQuestion = 0;
      switchPage('quiz');
      renderQuestion();
    });

    // 答题页：返回首页
    DOM.btnBack.addEventListener('click', () => {
      // 如果有已答题目，简单确认
      const hasAnswer = state.answers.some(a => a !== null);
      if (hasAnswer) {
        if (confirm('确定要退出吗？已答的题目不会被保存。')) {
          switchPage('welcome');
        }
      } else {
        switchPage('welcome');
      }
    });

    // 选项点击
    DOM.btnOptionA.addEventListener('click', () => selectAnswer('A'));
    DOM.btnOptionB.addEventListener('click', () => selectAnswer('B'));

    // 上一题
    DOM.btnPrev.addEventListener('click', goPrev);

    // 下一题
    DOM.btnNext.addEventListener('click', goNext);

    // 提交
    DOM.btnSubmit.addEventListener('click', submitTest);

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (state.currentPage !== 'quiz') return;

      switch (e.key) {
        case '1':
        case 'a':
        case 'A':
          e.preventDefault();
          selectAnswer('A');
          break;
        case '2':
        case 'b':
        case 'B':
          e.preventDefault();
          selectAnswer('B');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'Enter':
          e.preventDefault();
          if (state.currentQuestion === questions.length - 1) {
            submitTest();
          } else {
            goNext();
          }
          break;
      }
    });
  }

  // ==================== CSS 动画补充 ====================
  function injectAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  // ==================== 初始化 ====================
  function init() {
    injectAnimations();
    bindEvents();
    // 初始显示首页
    switchPage('welcome');
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
