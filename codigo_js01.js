const { jsPDF } = window.jspdf; // PDF

let refazerClicked = false;

function abrirSimulador(){
  const overlay = document.getElementById('simuladorOverlay');
  overlay.style.display = 'flex'; // Mostrar o overlay
  overlay.classList.add('active');
  // Ocultar telas do simulador
  document.getElementById('pf-step1').classList.remove('active');
  document.getElementById('pf-step2').classList.remove('active');

  // Limpar campos
  limparCampos();

  // Mostra a tela 1
  setTimeout(() => {
    document.getElementById('pf-step1').classList.add('active');
  }, 300);
  document.body.classList.add('no-scroll'); // trava rolagem
  document.body.classList.add('no-horizontal-scroll'); // trava rolagem horizontal
  document.body.style.paddingRight = '17px'; // Compensar a largura da barra de rolagem
}

function fecharSimulador(){
  const overlay = document.getElementById('simuladorOverlay');
  overlay.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('active', 'closing');
    limparCampos();
    document.body.classList.remove('no-scroll'); // libera rolagem
    document.body.classList.remove('no-horizontal-scroll'); // libera rolagem horizontal
    document.body.style.paddingRight = ''; // Remover compensação da largura da barra de rolagem
  }, 300);
}

function limparCampos(){
  document.getElementById('consumo').value = '';
  document.getElementById('precoKwh').value = 'R$ 0,9384';
  document.getElementById('tipoPublico').value='';
  document.getElementById('tipoPublico').disabled=true;
  document.getElementById('periodoCarencia').innerHTML='';
  document.getElementById('periodoCarencia').value='';
  document.getElementById('prazoFinanciamento').innerHTML='';
  document.getElementById('prazoFinanciamento').value='';
  document.getElementById('prazoFinanciamento').disabled=true;
  clearSimulationResults();
}

function validarTela1(){
  const consumo = document.getElementById('consumo');
  const preco = document.getElementById('precoKwh');
  const tipoPublico = document.getElementById('tipoPublico');
  const carencia = document.getElementById('periodoCarencia');
  const prazo = document.getElementById('prazoFinanciamento');

  let valid = true;
  [consumo, preco, tipoPublico, carencia, prazo].forEach(el => {
    if(!el.value){
      aplicarErro(el); 
      valid=false;
    }
  });
  if(!valid) return;

  // Se estiver tudo válido => vai para resultados
  updateSimulationResults();
  mostrarTela('pf-step2');
}

function aplicarErro(campo){
  campo.classList.add('pf-error');
  setTimeout(() => {
    campo.classList.remove('pf-error');
    campo.focus();
  }, 700);
}

function mostrarTela(telaId){
  document.querySelectorAll('.simulador-step').forEach(step => {
    step.classList.remove('active');
    step.classList.add('inactive');
  });
  document.getElementById(telaId).classList.remove('inactive');
  document.getElementById(telaId).classList.add('active');
}

function refazerSimulacao(){
  refazerClicked = true;
  mostrarTela('pf-step1');
}

// Lógicas de carência, prazo e máscaras
window.addEventListener('DOMContentLoaded', ()=>{
  const consumo = document.getElementById('consumo');
  const preco = document.getElementById('precoKwh');
  const tipoPublico = document.getElementById('tipoPublico');
  const carencia = document.getElementById('periodoCarencia');
  const prazo = document.getElementById('prazoFinanciamento');

  consumo.addEventListener('focus',()=>{
    consumo.value=consumo.value.replace(' kWh','');
  });
  consumo.addEventListener('blur',()=>{
    if(consumo.value.trim()!=='') {
      consumo.value=consumo.value.trim()+' kWh';
    }
  });
  consumo.addEventListener('input',()=>{
    let val = consumo.value.replace(/[^\d]/g,'');
    consumo.value = val? val:'';
    if(consumo.value && preco.value){
      tipoPublico.disabled=false;
    } else {
      tipoPublico.disabled=true;
      tipoPublico.value='';
      carencia.disabled=true;
      carencia.value='';
      prazo.disabled=true;
      prazo.value='';
      clearSimulationResults();
    }
  });

  preco.addEventListener('input',()=>{
    let val = preco.value.replace(/\D/g,'');
    if(val){
      val=(val/100).toFixed(2).replace('.',',');
      val=val.replace(/(\d)(?=(\d{3})+\,)/g,'$1.');
      preco.value='R$ '+val;
    } else {
      preco.value='';
    }
    if(consumo.value && preco.value){
      tipoPublico.disabled=false;
    } else {
      tipoPublico.disabled=true;
      tipoPublico.value='';
      carencia.disabled=true;
      carencia.value='';
      prazo.disabled=true;
      prazo.value='';
      clearSimulationResults();
    }
  });

  tipoPublico.addEventListener('change',()=>{
    prazo.disabled=false;
    prazo.value='';
    carencia.disabled=false;
    carencia.value='';
    clearSimulationResults();
  });

  prazo.addEventListener('focus',()=>{
    // Preenche 84..1 somente quando focado (para não gerar duplicado)
    if(prazo.options.length <= 1){
      prazo.innerHTML = `<option value="" disabled hidden></option>`;
      for(let i = 84; i >= 1; i--){
        let op = document.createElement('option');
        op.value = i;
        op.textContent = `${i} parcela${i > 1 ? 's' : ''}`;
        prazo.appendChild(op);
      }
    }
  });
  prazo.addEventListener('change',()=>{
    const linha = tipoPublico.value;
    if(!linha)return;
    const p = parseInt(prazo.value)||0;
    const maxCarencia = getMaxPrazo(linha) - p;
    updateCarenciaOptions(maxCarencia,carencia);
    clearSimulationResults();
  });

  carencia.addEventListener('focus',()=>{
    // Preenche 0..4 somente quando focado (para não gerar duplicado)
    if(carencia.options.length<=1){
      carencia.innerHTML=`<option value="" disabled hidden></option>`;
      for(let i=0;i<=4;i++){
        let op=document.createElement('option');
        op.value=i;
        op.textContent = i === 0 ? 'Sem carência' : `${i} ${i === 1 ? 'mês' : 'meses'}`;
        carencia.appendChild(op);
      }
    }
  });
  carencia.addEventListener('change',()=>{
    const linha = tipoPublico.value;
    if (!linha) return;
    const p = parseInt(prazo.value) || 0;
    const c = parseInt(carencia.value) || 0;
    const maxPrazo = getMaxPrazo(linha);
    const adjustedPrazo = maxPrazo - c;
    updateParcelOptions(adjustedPrazo, prazo);
    if (p > adjustedPrazo) {
      prazo.value = adjustedPrazo;
    }
    clearSimulationResults();
  });

  const simuladorOverlay = document.querySelector('.simulador-overlay');
  if (simuladorOverlay) {
    simuladorOverlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        fecharSimulador();
      }
    });
  }
});

function updateCarenciaOptions(max, selectEl){
  const current = parseInt(selectEl.value) || 0;
  selectEl.innerHTML = `<option value="" disabled hidden></option>`;
  for(let i = 0; i <= 4; i++){
    let op = document.createElement('option');
    op.value = i;
    op.textContent = i === 0 ? 'Sem carência' : `${i} ${i === 1 ? 'mês' : 'meses'}`;
    selectEl.appendChild(op);
  }
  selectEl.disabled = false;
  if(current <= 4){
    selectEl.value = current;
  } else {
    selectEl.value = '';
  }
}

function updateParcelOptions(max, selectEl) {
  const current = parseInt(selectEl.value) || 0;
  selectEl.innerHTML = `<option value="" disabled hidden></option>`;
  for (let i = max; i >= 1; i--) {
    let op = document.createElement('option');
    op.value = i;
    op.textContent = `${i} parcela${i > 1 ? 's' : ''}`;
    selectEl.appendChild(op);
  }
  selectEl.disabled = false;
  if (current && current <= max) {
    selectEl.value = current;
  } else {
    selectEl.value = '';
  }
}

function clearSimulationResults(){
  document.getElementById('financing-amount').innerText='R$ 0,00';
  document.getElementById('simulated-installment').innerText='R$ 0,00';
  document.getElementById('parcela-info').innerText='';
  const carInfo=document.getElementById('carencia-info');
  carInfo.style.display='none';
  carInfo.innerText='';
  document.getElementById('carbono-info').innerHTML=`
    <p>1 ano: 0 kgCO₂/kWh</p>
    <p>10 anos: 0 kgCO₂/kWh</p>
    <p>20 anos: 0 kgCO₂/kWh</p>
  `;
}

/* =================== CÁLCULOS AVANÇADOS =================== */
const taxasAvancadas={
  "245":{
    juros:[
      {max:36,taxa:2.20},
      {max:60,taxa:2.50},
      {max:84,taxa:2.90}
    ]
  },
  "246":{
    juros:[
      {max:36,taxa:1.17},
      {max:60,taxa:1.27},
      {max:84,taxa:1.37}
    ]
  },
  "247":{
    juros:[
      {max:36,taxa:1.30},
      {max:60,taxa:1.50},
      {max:84,taxa:1.80}
    ]
  }
};
function getMaxPrazo(linha){
  const faixas = taxasAvancadas[linha].juros;
  let m=0;
  faixas.forEach(f=>{ if(f.max>m)m=f.max; });
  return m;
}
function getTaxaPorPrazo(linha, prazoTotal){
  const faixas = taxasAvancadas[linha].juros;
  for(let faixa of faixas){
    if(prazoTotal<=faixa.max){
      return faixa.taxa;
    }
  }
  return faixas[faixas.length-1].taxa;
}
function baseFinancingAmount(consumption){
  return consumption*30;
}
function capitalizarDiario(principal, i_mensal, dias){
  if(dias<=0)return principal;
  const dec=new Decimal(i_mensal);
  const dailyRate=dec.plus(1).pow(new Decimal(1).div(30)).minus(1);
  return new Decimal(principal).mul(
    new Decimal(1).plus(dailyRate).pow(dias)
  );
}
function calcularIOF(valorBase, dias){
  const base=new Decimal(valorBase);
  const iofFixo=base.mul(0.0038);
  const iofAdic=base.mul(0.000082).mul(dias);
  return iofFixo.plus(iofAdic);
}
function calcularPMT(principal, taxaNominal, nMeses){
  const pm=new Decimal(taxaNominal).div(100);
  const cap=new Decimal(principal);
  if(pm.equals(0)){
    return cap.div(nMeses);
  } else {
    const num=pm.mul(cap);
    const den=new Decimal(1).minus(
      new Decimal(1).plus(pm).pow(-nMeses)
    );
    return num.div(den);
  }
}
function calculateCarbonNeutralized(consumption){
  const carbonPerKwh=0.0385;
  const monthly=consumption*carbonPerKwh;
  const yearly=monthly*12;
  const tenYears=yearly*10;
  const twentyYears=yearly*20;
  return { yearly: Math.round(yearly), tenYears: Math.round(tenYears), twentyYears: Math.round(twentyYears) };
}
function updateSimulationResults(){
  const consumoInput=document.getElementById('consumo');
  const precoInput=document.getElementById('precoKwh');
  const linha=document.getElementById('tipoPublico').value;
  const carenciaVal=parseInt(document.getElementById('periodoCarencia').value)||0;
  const prazoVal=parseInt(document.getElementById('prazoFinanciamento').value)||0;

  if(!consumoInput.value||!precoInput.value||!linha||!prazoVal){
    clearSimulationResults();
    return;
  }
  const consumptionVal=parseFloat(
    consumoInput.value.replace(' kWh','').trim()
  )||0;
  let principal=baseFinancingAmount(consumptionVal);

  let prazoTotal=prazoVal+carenciaVal;
  const maxPz=getMaxPrazo(linha);
  if(prazoTotal>maxPz) prazoTotal=maxPz;
  if(prazoVal<=0){
    clearSimulationResults(); 
    return;
  }

  const taxaNominal=getTaxaPorPrazo(linha, prazoTotal);
  const i_mensal=taxaNominal/100;
  const dias=30*carenciaVal;
  let saldo=capitalizarDiario(principal,i_mensal,dias);
  let iof=calcularIOF(saldo,dias);
  let saldoFinal=new Decimal(saldo).plus(iof);
  const pmt=calcularPMT(saldoFinal, taxaNominal, prazoVal);

  // UI
  document.getElementById('financing-amount').innerText=
    formatCurrency(saldoFinal.toFixed(2));
  document.getElementById('simulated-installment').innerText=
    formatCurrency(pmt.toFixed(2));
  document.getElementById('parcela-info').innerText=
    `em ${prazoVal} parcela${prazoVal > 1 ? 's' : ''} ${prazoVal > 1 ? 'mensais' : 'mensal'}`;

  const carenciaInfo=document.getElementById('carencia-info');
  if(carenciaVal>0){
    carenciaInfo.style.display='block';
    carenciaInfo.innerText=`com ${carenciaVal} ${carenciaVal === 1 ? 'mês' : 'meses'} de carência`;
  } else {
    carenciaInfo.style.display='none';
  }

  const carbon=calculateCarbonNeutralized(consumptionVal);
  document.getElementById('carbono-info').innerHTML=` 
    <p>1 ano: ${carbon.yearly} kgCO₂/kWh</p>
    <p>10 anos: ${carbon.tenYears} kgCO₂/kWh</p>
    <p>20 anos: ${carbon.twentyYears} kgCO₂/kWh</p>
  `;

  // Adicionar linha selecionada
  const linhaSelecionada = document.getElementById('tipoPublico').selectedOptions[0].text;
  document.getElementById('linha-selecionada').innerText = `Linha de Financiamento: ${linhaSelecionada}`;
}
function formatCurrency(val){
  return parseFloat(val).toLocaleString('pt-BR',{
    style:'currency',currency:'BRL'
  });
}

// Gera o PDF do resultado
function gerarPdfSimulador() {
  document.body.classList.add('no-scroll'); // Trava rolagem
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);

  // Adicionar título com duas linhas
  doc.setTextColor('#1abc9c');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Financiamento Energia Solar Banpará', doc.internal.pageSize.getWidth() / 2, 60, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Resultado da Simulação', doc.internal.pageSize.getWidth() / 2, 80, { align: 'center' });

  // Coletar dados
  const resultContainer = document.querySelector('.pf-result-container');
  const timestamp = new Date().toLocaleString('pt-BR');

  // Clonar o container para evitar alterações visuais no original
  const clone = resultContainer.cloneNode(true);
  clone.style.width = '800px'; // Ajustar largura para melhor renderização
  clone.style.padding = '20px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#333';
  clone.style.fontFamily = 'Poppins, sans-serif';
  clone.style.fontSize = '14px';
  clone.style.lineHeight = '1.6';
  clone.style.letterSpacing = '0.5px'; // Adicionar espaçamento entre letras
  document.body.appendChild(clone);

  // Converter o clone em imagem usando html2canvas
  html2canvas(clone, { scale: 3, backgroundColor: '#ffffff' }).then(canvas => {
    const imgData = canvas.toDataURL('image/jpeg', 1.0); // Usar JPEG com qualidade máxima
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth() - 100;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    doc.addImage(imgData, 'JPEG', 50, 100, pdfWidth, pdfHeight);

    // Adicionar Timestamp
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    doc.setFont(undefined, 'italic');
    doc.text('• Simulação realizada em: ' + timestamp, 50, 100 + pdfHeight + 20);

    // Salvar PDF
    doc.save('Sim_Fin_Energ-Solar_BP_PF.pdf');
    document.body.classList.remove('no-scroll'); // Libera rolagem

    // Remover o clone após a geração do PDF
    document.body.removeChild(clone);
  }).catch(error => {
    console.error('Erro ao gerar PDF:', error);
    document.body.classList.remove('no-scroll'); // Libera rolagem em caso de erro
  });
}

function gerarPDF() {
  // Exemplo simples de restauração de funcionalidade
  // ...lógica de PDF (ex: doc, disclaimers, etc.)...
  doc.save('simulador.pdf');
}

// JavaScript de Funcionalidades
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar AOS
  AOS.init({
    duration: 800,
    offset: 200,
    once: true,
  });

  // MENU HAMBÚRGUER
  const menuToggle = document.querySelector('.menu-toggle');
  const navUl = document.querySelector('nav ul');
  menuToggle.addEventListener('click', () => {
    navUl.classList.toggle('show-menu');
    // Alterna ícone
    menuToggle.querySelector('i').classList.toggle('fa-bars');
    menuToggle.querySelector('i').classList.toggle('fa-times');
  });

  // Lógica da Timeline
  const timeline = document.querySelector(".timeline");
  const timelineLine = document.getElementById("timelineLine");
  const items = document.querySelectorAll(".timeline-item");
  let circleCenters = [];
  let firstCircleY = 0;
  let lastCircleY = 0;

  window.addEventListener("resize", setupTimeline);
  window.addEventListener("orientationchange", setupTimeline);
  window.addEventListener("scroll", onScroll);

  function setupTimeline() {
    calcCirclePositions();
    if (circleCenters.length > 0) {
      firstCircleY = circleCenters[0];
      lastCircleY = circleCenters[circleCenters.length - 1];
      timelineLine.style.top = "70px";
      timelineLine.style.height = "0px";
    }
    items.forEach(item => item.classList.remove("active"));
    onScroll();
  }

  function calcCirclePositions() {
    circleCenters = [];
    const timelineRect = timeline.getBoundingClientRect();
    const timelineTop = window.scrollY + timelineRect.top;

    items.forEach(item => {
      const circle = item.querySelector(".circle");
      const cRect = circle.getBoundingClientRect();
      const circleCenter = (window.scrollY + cRect.top) - timelineTop + (cRect.height / 2);
      circleCenters.push(circleCenter);
    });

    circleCenters.sort((a, b) => a - b);
  }

  function onScroll() {
    if (!circleCenters.length) return;

    const timelineRect = timeline.getBoundingClientRect();
    const timelineTop = window.scrollY + timelineRect.top;
    const midScreen = window.scrollY + window.innerHeight / 2;
    const relativeScroll = midScreen - (timelineTop + firstCircleY);
    const totalDist = lastCircleY - firstCircleY;
    const offset = 30; 
    const fillDist = Math.max(0, Math.min(relativeScroll, totalDist - offset)); 

    requestAnimationFrame(() => {
      timelineLine.style.height = `${fillDist}px`;
      items.forEach((item, i) => {
        const circlePos = circleCenters[i] - firstCircleY;
        if (fillDist >= circlePos - 30) {
          item.classList.add("active");
        }
      });
    });
  }

  window.addEventListener("load", setupTimeline);

  // Accordion FAQ
  const accordionItems = document.querySelectorAll(".accordion-item");
  accordionItems.forEach(item => {
    const header = item.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      accordionItems.forEach(el => {
        if (el !== item) {
          el.classList.remove("active-accordion");
          el.querySelector(".accordion-header").setAttribute('aria-expanded', 'false');
        }
      });
      const isActive = item.classList.toggle("active-accordion");
      header.setAttribute('aria-expanded', isActive);
    });

    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        header.click();
      }
    });
  });

  // Carousel na Hero Section
  const slides = document.querySelectorAll('.slide');
  const indicators = document.querySelectorAll('.carousel-indicators span');
  const leftArrow = document.querySelector('.carousel-arrow.left');
  const rightArrow = document.querySelector('.carousel-arrow.right');
  let currentSlide = 2; 
  const totalSlides = slides.length;
  let slideInterval;
  let firstSlideFlag = true;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.remove('active', 'previous');
      if (i === index) {
        slide.classList.add('active');
        slides[(i - 1 + totalSlides) % totalSlides].classList.add('previous');
      }
    });
    indicators.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
    });
  }

  function nextSlide(){
    currentSlide = (currentSlide + 1) % totalSlides;
    showSlide(currentSlide);
  }

  function prevSlide(){
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    showSlide(currentSlide);
  }

  function startSlideShow(){
    let interval = firstSlideFlag ? 10000 : 8000;
    firstSlideFlag = false;
    slideInterval = setInterval(nextSlide, interval);
  }

  function resetSlideShow(){
    clearInterval(slideInterval);
    startSlideShow();
  }

  startSlideShow();

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      currentSlide = index;
      showSlide(currentSlide);
      resetSlideShow();
    });
  });

  slides.forEach(slide => {
    slide.addEventListener('mouseenter', () => clearInterval(slideInterval));
    slide.addEventListener('mouseleave', () => startSlideShow());
  });

  leftArrow.addEventListener('click', () => {
    prevSlide();
    resetSlideShow();
  });

  rightArrow.addEventListener('click', () => {
    nextSlide();
    resetSlideShow();
  });

  // Scroll suave com offset
  const navLinks = document.querySelectorAll('nav ul li a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        const headerHeight = document.querySelector('header').offsetHeight;
        const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - headerHeight + 10;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
      // Fechar menu ao clicar (mobile)
      if (navUl.classList.contains('show-menu')) {
        navUl.classList.remove('show-menu');
        menuToggle.querySelector('i').classList.toggle('fa-bars');
        menuToggle.querySelector('i').classList.toggle('fa-times');
      }
    });
  });

  // Atualizar classe ativa no menu conforme a seção visível
  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - document.querySelector('header').offsetHeight - 50;
      if (pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href').substring(1) === current) {
        a.classList.add('active');
      }
    });
  });

  // Toggle de Modo Escuro via Mascote
  const toggleMascot = document.getElementById('toggle-dark-mode-mascot');
  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    toggleMascot.src = isDark ? 'mascote-dark.png' : 'mascote.png';
    toggleMascot.setAttribute('aria-pressed', isDark);
    toggleMascot.setAttribute('aria-label', isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Noturno');
    mostrarNotificacao(isDark ? 'Modo Noturno Ativado' : 'Modo Claro Ativado');
    toggleMascot.focus();
  }
  toggleMascot.addEventListener('click', toggleDarkMode);
  toggleMascot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDarkMode();
    }
  });

  // Função para Mostrar Notificações como Balão de Fala
  window.mostrarNotificacao = function(mensagem) {
    const mascoteContainer = document.querySelector('.mascote-container');
    if (!mascoteContainer) return;
    const existingNotificacao = mascoteContainer.querySelector('.notificacao');
    if (existingNotificacao) {
      mascoteContainer.removeChild(existingNotificacao);
    }
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao';
    notificacao.innerText = mensagem;
    mascoteContainer.appendChild(notificacao);
    void notificacao.offsetWidth;
    notificacao.classList.add('visivel');
    setTimeout(() => {
      notificacao.classList.remove('visivel');
      notificacao.addEventListener('transitionend', () => {
        if (mascoteContainer.contains(notificacao)) {
          mascoteContainer.removeChild(notificacao);
        }
      });
    }, 3000);
  }

  // Intersection Observer para Mascote
  const primeiraSecao = document.getElementById('inicio');
  const mascote = document.querySelector('.mascote-container');
  const mascoteObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        mascote.classList.add('visible');
      } else {
        mascote.classList.remove('visible');
      }
    });
  }, { root: null, threshold: 0 });
  mascoteObserver.observe(primeiraSecao);

  /*
   * ANIMAÇÃO PARA O MASCOTE "BALANÇAR" PERIODICAMENTE
   * Chamaremos a função a cada 20 segundos para incitar o clique
   */
  function chamarAtencaoMascote() {
    toggleMascot.classList.add('chamar-atencao');
    setTimeout(() => {
      toggleMascot.classList.remove('chamar-atencao');
    }, 1200); // Duração da animação (1.2s, definido no CSS)
  }

  // Dispara a animação a cada 20 segundos
  setInterval(chamarAtencaoMascote, 20000);

  // Mascot Disappearance and Reappearance
  const mascoteContainer = document.querySelector('.mascote-container');
  const beneficiosSection = document.getElementById('beneficios');
  const inicioSection = document.getElementById('inicio');
  let lastScrollTop = 0;
  let timeout;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const beneficiosMidPoint = beneficiosSection.offsetTop + beneficiosSection.offsetHeight / 2;
    const inicioBottom = inicioSection.offsetTop + inicioSection.offsetHeight;

    if (scrollTop + windowHeight >= documentHeight) {
      mascoteContainer.classList.add('hidden');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        mascoteContainer.classList.remove('hidden');
        mascoteContainer.classList.add('visible');
      }, 2000);
    } else if (scrollTop >= beneficiosMidPoint) {
      mascoteContainer.classList.add('visible');
    } else if (scrollTop < inicioBottom) {
      mascoteContainer.classList.remove('visible');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  });

  // Random Animation on Hover
  const animations = ['shake', 'rotate', 'scale'];
  toggleMascot.addEventListener('mouseenter', () => {
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    toggleMascot.style.animation = `${randomAnimation} 0.5s`;
    toggleMascot.addEventListener('animationend', () => {
      toggleMascot.style.animation = '';
    }, { once: true });
  });

});
