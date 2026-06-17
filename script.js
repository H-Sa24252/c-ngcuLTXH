const queueForm = document.getElementById('queueForm');
const lambdaInput = document.getElementById('lambda');
const muInput = document.getElementById('mu');
const warningText = document.getElementById('warningText');
const rhoOutput = document.getElementById('rho');
const LOutput = document.getElementById('L');
const LqOutput = document.getElementById('Lq');
const WOutput = document.getElementById('W');
const WqOutput = document.getElementById('Wq');
const displayLambda = document.getElementById('displayLambda');
const displayMu = document.getElementById('displayMu');
const displayQueue = document.getElementById('displayQueue');
const displayService = document.getElementById('displayService');
const displayServed = document.getElementById('displayServed');
const displayWqSim = document.getElementById('displayWqSim');
const displayWSim = document.getElementById('displayWSim');
const simViewport = document.getElementById('simViewport');

let lambda = 0;
let mu = 0;
let nextArrival = Infinity;
let serverBusyUntil = 0;
let queue = [];
let activeService = null;
let customerCount = 0;
let simulationActive = false;
let simulationSpeed = 1;
let servedCount = 0;
let totalWaitTime = 0;
let totalServiceTime = 0;
const simStatus = document.getElementById('simStatus');

function formatValue(value) {
  return isFinite(value) ? value.toFixed(3) : '-';
}

function sampleExponential(rate) {
  return rate > 0 ? -Math.log(1 - Math.random()) / rate : Infinity;
}

function sampleArrivalInterval() {
  return lambda > 0 ? sampleExponential(lambda / 60000) : Infinity;
}

function sampleServiceDuration() {
  return mu > 0 ? sampleExponential(mu / 60000) : Infinity;
}

function setResults(values) {
  rhoOutput.textContent = formatValue(values.rho);
  LOutput.textContent = formatValue(values.L);
  LqOutput.textContent = formatValue(values.Lq);
  WOutput.textContent = formatValue(values.W);
  WqOutput.textContent = formatValue(values.Wq);
}

function showWarning(message) {
  warningText.textContent = message;
}

function resetResults() {
  setResults({ rho: '-', L: '-', Lq: '-', W: '-', Wq: '-' });
}

function updateRates() {
  const rawLambda = parseFloat(lambdaInput.value);
  const rawMu = parseFloat(muInput.value);
  lambda = Number.isFinite(rawLambda) ? rawLambda : 0;
  mu = Number.isFinite(rawMu) ? rawMu : 0;
  displayLambda.textContent = lambda.toFixed(2);
  displayMu.textContent = mu.toFixed(2);
}

function resetSimulation() {
  queue.forEach(entry => entry.element.remove());
  queue = [];
  if (activeService) {
    activeService.element.remove();
    activeService = null;
  }
  simulationActive = false;
  nextArrival = Infinity;
  servedCount = 0;
  totalWaitTime = 0;
  totalServiceTime = 0;
  displayQueue.textContent = '0';
  displayService.textContent = '0';
  displayServed.textContent = '0';
  displayWqSim.textContent = '-';
  displayWSim.textContent = '-';
  simStatus.textContent = 'Đã dừng';
}

function resetForm() {
  lambdaInput.value = '0';
  muInput.value = '0';
  updateRates();
  resetResults();
  showWarning('');
  resetSimulation();
}

function startSimulation(speed = 1) {
  updateRates();

  if (lambda <= 0 || mu <= 0) {
    showWarning('λ và μ phải lớn hơn 0 để mô phỏng.');
    return;
  }

  if (lambda >= mu) {
    showWarning('Hệ thống không ổn định khi λ ≥ μ. Mô phỏng vẫn chạy nhưng hàng đợi có thể tăng lên.');
  } else {
    showWarning('');
  }

  resetSimulation();
  simulationSpeed = Math.max(1, speed);
  nextArrival = performance.now() + sampleArrivalInterval() / simulationSpeed;
  simulationActive = true;
  simStatus.textContent = simulationSpeed > 1 ? `Đang chạy (nhanh x${simulationSpeed})` : 'Đang chạy';
}

function stopSimulation() {
  simulationActive = false;
  simStatus.textContent = 'Đã dừng';
}

function calculateQueue(e) {
  e.preventDefault();
  updateRates();

  if (lambda <= 0 || mu <= 0) {
    showWarning('λ và μ phải lớn hơn 0 để tính toán.');
    resetResults();
    return;
  }

  if (lambda >= mu) {
    showWarning('Hệ thống không ổn định khi λ ≥ μ. Hãy giảm λ hoặc tăng μ.');
  } else {
    showWarning('');
  }

  const rho = lambda / mu;
  const L = rho / (1 - rho);
  const Lq = (rho * rho) / (1 - rho);
  const W = 1 / (mu - lambda);
  const Wq = rho / (mu - lambda);

  setResults({ rho, L, Lq, W, Wq });
}

function createCustomer() {
  const customer = document.createElement('div');
  customer.className = 'customer';
  customer.textContent = queue.length + 1;
  simViewport.appendChild(customer);
  return customer;
}

function updatePositions() {
  queue.forEach((entry, index) => {
    if (entry.status === 'queue') {
      const x = 30 + index * 54;
      const y = 150;
      entry.element.style.transform = `translate(${x}px, ${y}px)`;
    }
  });

  if (activeService) {
    activeService.element.style.transform = `translate(260px, 238px)`;
    activeService.element.classList.add('service');
  }
}

function cleanupCustomer(entry) {
  entry.element.classList.add('exit');
  entry.element.style.transform = 'translate(260px, 120px)';
  setTimeout(() => {
    entry.element.remove();
  }, 700);
}

function processQueue(now) {
  if (!activeService && queue.length > 0) {
    const next = queue.shift();
    next.status = 'service';
    next.waitTime = now - next.arrivalTime;
    totalWaitTime += next.waitTime;
    next.serviceDuration = sampleServiceDuration();
    totalServiceTime += next.serviceDuration;
    activeService = next;
    serverBusyUntil = now + next.serviceDuration / simulationSpeed;
    servedCount += 1;
    displayService.textContent = '1';
    displayQueue.textContent = queue.length;
    displayServed.textContent = servedCount.toString();
    displayWqSim.textContent = (totalWaitTime / servedCount / 60000).toFixed(3);
    displayWSim.textContent = (totalServiceTime / servedCount / 60000).toFixed(3);
    updatePositions();
  }

  if (activeService && now >= serverBusyUntil) {
    cleanupCustomer(activeService);
    activeService = null;
    displayService.textContent = '0';
  }
}

function addCustomer() {
  const entry = {
    id: ++customerCount,
    status: 'queue',
    arrivalTime: performance.now(),
    element: createCustomer()
  };
  queue.push(entry);
  displayQueue.textContent = queue.length;
  updatePositions();
}

function animate(now) {
  if (simulationActive && now >= nextArrival) {
    addCustomer();
    nextArrival = now + sampleArrivalInterval();
  }

  processQueue(now);
  requestAnimationFrame(animate);
}

queueForm.addEventListener('submit', calculateQueue);
const resetButton = document.getElementById('resetButton');
const startSimButton = document.getElementById('startSimButton');
const fastSimButton = document.getElementById('fastSimButton');
const stopSimButton = document.getElementById('stopSimButton');

lambdaInput.addEventListener('input', () => {
  updateRates();
});
muInput.addEventListener('input', () => {
  updateRates();
});
resetButton.addEventListener('click', resetForm);
startSimButton.addEventListener('click', () => startSimulation(1));
fastSimButton.addEventListener('click', () => startSimulation(10));
stopSimButton.addEventListener('click', stopSimulation);

window.addEventListener('load', () => {
  updateRates();
  resetResults();
  resetSimulation();
  requestAnimationFrame(animate);
});
