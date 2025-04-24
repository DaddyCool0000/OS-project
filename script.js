// Process class to store process information
class Process {
    constructor(id, arrivalTime, burstTime, priority = 0) {
        this.id = id;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.priority = priority;
        this.remainingTime = burstTime;
        this.completionTime = 0;
        this.waitingTime = 0;
        this.turnaroundTime = 0;
    }
}

// Global variables
let processes = [];
let processCounter = 1;
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];

// New global variables for execution control
let currentSchedule = [];
let currentExecutionIndex = 0;
let executionInterval = null;
let executionSpeed = 1000; // milliseconds per step

let timelineInterval;
let currentTime = 0;
let isPlaying = false;

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements after the document is loaded
    const algorithmSelect = document.getElementById('algorithm');
    const timeQuantumInput = document.getElementById('time-quantum');
    const processList = document.getElementById('process-list');
    const addProcessBtn = document.getElementById('add-process');
    const visualizeBtn = document.getElementById('visualizeBtn');
    const playTimelineBtn = document.getElementById('playTimeline');
    const pauseTimelineBtn = document.getElementById('pauseTimeline');
    const resetTimelineBtn = document.getElementById('resetTimeline');
    const resetBtn = document.getElementById('resetBtn');
    const compareBtn = document.getElementById('compareAlgorithms');
    const exportBtn = document.getElementById('exportBtn');
    const ganttChart = document.getElementById('gantt-chart');
    const resultsBody = document.getElementById('results-body');
    const summaryStats = document.getElementById('summary-stats');
    const modal = document.getElementById('process-modal');
    const closeModal = document.querySelector('.close-modal');

    // Theme handling
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';

    // Theme toggle handler
    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'dark' : 'light';
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Event Listeners
    addProcessBtn.addEventListener('click', addProcessRow);
    visualizeBtn.addEventListener('click', visualize);
    algorithmSelect.addEventListener('change', handleAlgorithmChange);
    playTimelineBtn.addEventListener('click', startExecution);
    pauseTimelineBtn.addEventListener('click', pauseExecution);
    resetTimelineBtn.addEventListener('click', resetTimeline);
    resetBtn.addEventListener('click', resetSimulation);
    compareBtn.addEventListener('click', compareAlgorithms);
    exportBtn.addEventListener('click', showExportModal);

    // Modal handlers
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Process data change listener for smart suggestions
    processList.addEventListener('input', () => {
        getProcessData();
        suggestAlgorithm();
    });

    // Initialize the first process row
    addProcessRow();
    handleAlgorithmChange();
});

// Functions
function handleAlgorithmChange() {
    const timeQuantumInput = document.getElementById('time-quantum');
    const algorithmInput = document.getElementById('algorithm');
    const algorithmBlocks = document.querySelectorAll('.algorithm-block');
    
    // Add click event listeners to algorithm blocks
    algorithmBlocks.forEach(block => {
        block.addEventListener('click', () => {
            // Remove active class from all blocks
            algorithmBlocks.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked block
            block.classList.add('active');
            
            // Update hidden input value
            const algorithm = block.dataset.algorithm;
            algorithmInput.value = algorithm;
            
            // Show/hide time quantum input based on algorithm
            if (algorithm === 'rr') {
                timeQuantumInput.parentElement.classList.add('show');
            } else {
                timeQuantumInput.parentElement.classList.remove('show');
            }
            
            // Update algorithm suggestion
            suggestAlgorithm();
        });
    });
    
    // Set initial active block
    const initialBlock = document.querySelector(`.algorithm-block[data-algorithm="${algorithmInput.value}"]`);
    if (initialBlock) {
        initialBlock.classList.add('active');
    }
}

function addProcessRow() {
    const processList = document.getElementById('process-list');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>P${processCounter}</td>
        <td><input type="number" min="0" value="0" class="arrival-time"></td>
        <td><input type="number" min="1" value="1" class="burst-time"></td>
        <td><input type="number" min="1" value="1" class="priority"></td>
        <td>
            <button class="btn danger-btn remove-process">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    processList.appendChild(row);
    processCounter++;

    // Add event listener to remove button
    row.querySelector('.remove-process').addEventListener('click', () => {
        row.remove();
        suggestAlgorithm();
    });
}

function getProcessData() {
    processes = [];
    const rows = document.getElementById('process-list').querySelectorAll('tr');
    rows.forEach((row, index) => {
        const arrivalTime = parseInt(row.querySelector('.arrival-time').value);
        const burstTime = parseInt(row.querySelector('.burst-time').value);
        const priority = parseInt(row.querySelector('.priority').value);
        processes.push(new Process(`P${index + 1}`, arrivalTime, burstTime, priority));
    });
}

function suggestAlgorithm() {
    if (processes.length === 0) {
        document.getElementById('algorithm-suggestion').style.display = 'none';
        return;
    }

    const burstTimes = processes.map(p => p.burstTime);
    const arrivalTimes = processes.map(p => p.arrivalTime);
    const priorities = processes.map(p => p.priority);

    const burstTimeVariance = Math.max(...burstTimes) - Math.min(...burstTimes);
    const hasDifferentPriorities = new Set(priorities).size > 1;
    const hasDifferentArrivalTimes = new Set(arrivalTimes).size > 1;

    let suggestion = '';
    let recommendedAlgorithm = '';

    if (burstTimeVariance > 5 && !hasDifferentPriorities) {
        suggestion = 'SJF is recommended here since burst times vary significantly.';
        recommendedAlgorithm = 'sjf';
    } else if (hasDifferentPriorities) {
        suggestion = 'Priority Scheduling is recommended due to varying process priorities.';
        recommendedAlgorithm = 'priority';
    } else if (hasDifferentArrivalTimes) {
        suggestion = 'FCFS is recommended for processes with different arrival times.';
        recommendedAlgorithm = 'fcfs';
    } else {
        suggestion = 'Round Robin is recommended for uniform process characteristics.';
        recommendedAlgorithm = 'rr';
    }

    document.getElementById('algorithm-suggestion').style.display = 'block';
    document.getElementById('algorithm-suggestion').textContent = suggestion;
    
    if (document.getElementById('algorithm').value !== recommendedAlgorithm) {
        document.getElementById('algorithm-suggestion').style.backgroundColor = 'rgba(74, 107, 255, 0.1)';
    } else {
        document.getElementById('algorithm-suggestion').style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
    }
}

function startExecution() {
    if (!currentSchedule || currentSchedule.length === 0) return;
    
    const totalTime = currentSchedule[currentSchedule.length - 1].endTime;
    if (currentTime >= totalTime) {
        currentTime = 0;
        resetHighlighting();
    }
    
    document.getElementById('playTimeline').disabled = true;
    document.getElementById('pauseTimeline').disabled = false;
    document.getElementById('resetTimeline').disabled = false;
    
    executionInterval = setInterval(() => {
        if (currentTime < totalTime) {
            currentTime++;
            document.getElementById('timelineSlider').value = currentTime;
            updateVisualization(currentTime);
        } else {
            pauseExecution();
            celebrateCompletion();
        }
    }, executionSpeed);
}

function pauseExecution() {
    clearInterval(executionInterval);
    document.getElementById('playTimeline').disabled = false;
    document.getElementById('pauseTimeline').disabled = true;
}

function resetTimeline() {
    pauseExecution();
    currentTime = 0;
    document.getElementById('timelineSlider').value = 0;
    document.getElementById('currentTime').textContent = 'Time: 0';
    
    // Reset button states
    document.getElementById('playTimeline').disabled = false;
    document.getElementById('pauseTimeline').disabled = true;
    document.getElementById('resetTimeline').disabled = true;
    
    // Reset highlighting
    const blocks = document.querySelectorAll('.gantt-block');
    blocks.forEach(block => {
        block.classList.remove('executing-block');
    });
    
    // Update visualization
    updateVisualization(0);
}

function getProcessState(processId, schedule, time) {
    // Find the process in the schedule
    const processEntries = schedule.filter(entry => entry.process.id === processId);
    
    if (processEntries.length === 0) {
        return { state: 'not-found' };
    }
    
    // Get process details
    const process = processEntries[0].process;
    
    // Check if process is currently running
    const isRunning = schedule.some(entry => 
        entry.process.id === processId &&
        entry.startTime <= time &&
        entry.endTime > time
    );
    
    if (isRunning) {
        return { state: 'running' };
    }
    
    // Check if process has completed
    const lastEntry = processEntries[processEntries.length - 1];
    if (lastEntry.endTime <= time) {
        return { state: 'completed' };
    }
    
    // Check if process has arrived
    if (process.arrivalTime > time) {
        return { state: 'not-arrived' };
    }
    
    // Process has arrived but is waiting
    return { state: 'waiting' };
}

function updateVisualization(time) {
    // Update time display
    document.getElementById('currentTime').textContent = `Time: ${time}`;
    
    // Update process states list
    const statesList = document.getElementById('processStatesList');
    if (!statesList) {
        console.error('Process states list element not found');
        return;
    }
    
    statesList.innerHTML = '';
    
    // Get unique processes
    const uniqueProcesses = [...new Set(currentSchedule.map(entry => entry.process.id))];
    
    uniqueProcesses.forEach(processId => {
        const state = getProcessState(processId, currentSchedule, time);
        const stateItem = document.createElement('div');
        stateItem.className = 'process-state-item';
        
        const stateText = state.state.charAt(0).toUpperCase() + state.state.slice(1);
        const stateColor = {
            'running': '#4CAF50',
            'waiting': '#FFC107',
            'completed': '#2196F3',
            'not-arrived': '#9E9E9E'
        }[state.state] || '#9E9E9E';
        
        stateItem.innerHTML = `
            <div class="state-indicator state-${state.state}" style="background-color: ${stateColor}"></div>
            <div class="state-info">
                <strong>Process ${processId}</strong>
                <div class="state-text">${stateText}</div>
            </div>
        `;
        
        statesList.appendChild(stateItem);
    });
    
    // Update Gantt chart highlighting and state indicators
    const blocks = document.querySelectorAll('.gantt-block');
    blocks.forEach((block, index) => {
        const entry = currentSchedule[index];
        const stateIndicator = block.querySelector('.process-state');
        
        // Get the current state of the process
        const processState = getProcessState(entry.process.id, currentSchedule, time);
        
        // Remove all state classes first
        stateIndicator.classList.remove('state-running', 'state-waiting', 'state-completed', 'state-not-arrived');
        
        // Add the appropriate state class
        stateIndicator.classList.add(`state-${processState.state}`);
        
        // Update block highlighting
        if (processState.state === 'running') {
            block.classList.add('executing-block');
        } else {
            block.classList.remove('executing-block');
        }
    });
    
    // Update time marker
    const timeMarker = document.querySelector('.time-marker');
    if (timeMarker) {
        const totalTime = currentSchedule[currentSchedule.length - 1].endTime;
        timeMarker.style.left = `${(time / totalTime) * 100}%`;
    }
}

function initializeTimeline(schedule) {
    if (!schedule || schedule.length === 0) return;
    
    const slider = document.getElementById('timelineSlider');
    const playBtn = document.getElementById('playTimeline');
    const pauseBtn = document.getElementById('pauseTimeline');
    const resetBtn = document.getElementById('resetTimeline');
    const totalTimeSpan = document.getElementById('totalTime');
    
    // Set slider range
    const totalTime = schedule[schedule.length - 1].endTime;
    slider.max = totalTime;
    totalTimeSpan.textContent = `Total: ${totalTime}`;
    
    // Reset controls
    slider.value = 0;
    currentTime = 0;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    
    // Update initial visualization
    updateVisualization(0);
    
    // Remove old event listeners
    const newSlider = slider.cloneNode(true);
    slider.parentNode.replaceChild(newSlider, slider);
    
    // Add event listener for slider
    newSlider.addEventListener('input', (e) => {
        currentTime = parseInt(e.target.value);
        updateVisualization(currentTime);
    });
}

function visualize() {
    getProcessData();
    if (processes.length === 0) {
        alert('Please add at least one process');
        return;
    }

    const algorithm = document.getElementById('algorithm').value;
    let schedule;

    switch (algorithm) {
        case 'fcfs':
            schedule = fcfs();
            break;
        case 'sjf':
            schedule = sjf();
            break;
        case 'rr':
            schedule = roundRobin(parseInt(document.getElementById('time-quantum').value));
            break;
        case 'priority':
            schedule = priorityScheduling();
            break;
    }

    currentSchedule = schedule;
    displayResults(schedule);
    drawGanttChart(schedule);
    initializeTimeline(schedule);
    
    // Calculate and update performance metrics
    const metrics = calculateMetrics(schedule);
    updatePerformanceDashboard(metrics);
    
    // Reset execution state
    currentExecutionIndex = 0;
    currentTime = 0;
    resetHighlighting();
}

// Scheduling Algorithms
function fcfs(processList = processes) {
    const schedule = [];
    let currentTime = 0;
    
    // Sort processes by arrival time
    const sortedProcesses = [...processList].sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    sortedProcesses.forEach(process => {
        if (currentTime < process.arrivalTime) {
            currentTime = process.arrivalTime;
        }
        
        schedule.push({
            process: process,
            startTime: currentTime,
            endTime: currentTime + process.burstTime
        });
        
        process.completionTime = currentTime + process.burstTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;
        
        currentTime += process.burstTime;
    });
    
    return schedule;
}

function sjf(processList = processes) {
    const schedule = [];
    let currentTime = 0;
    const readyQueue = [];
    const completedProcesses = new Set();
    const remainingProcesses = [...processList];
    
    while (completedProcesses.size < remainingProcesses.length) {
        // Add processes that have arrived to ready queue
        for (let i = 0; i < remainingProcesses.length; i++) {
            const process = remainingProcesses[i];
            if (!completedProcesses.has(process) && process.arrivalTime <= currentTime && !readyQueue.includes(process)) {
                readyQueue.push(process);
            }
        }
        
        if (readyQueue.length === 0) {
            currentTime++;
            continue;
        }
        
        // Sort ready queue by burst time
        readyQueue.sort((a, b) => a.burstTime - b.burstTime);
        
        const currentProcess = readyQueue.shift();
        schedule.push({
            process: currentProcess,
            startTime: currentTime,
            endTime: currentTime + currentProcess.burstTime
        });
        
        currentProcess.completionTime = currentTime + currentProcess.burstTime;
        currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
        currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
        
        currentTime += currentProcess.burstTime;
        completedProcesses.add(currentProcess);
    }
    
    return schedule;
}

function roundRobin(quantum, processList = processes) {
    const schedule = [];
    let currentTime = 0;
    const readyQueue = [];
    const completedProcesses = new Set();
    
    // Create a deep copy of processes with remaining time
    const remainingProcesses = processList.map(p => ({
        ...p,
        remainingTime: p.burstTime,
        waitingTime: 0,
        turnaroundTime: 0,
        completionTime: 0,
        lastExecutionEnd: 0 // Add this to track waiting time correctly
    }));
    
    // Initialize ready queue with processes that have arrived
    remainingProcesses.forEach(process => {
        if (process.arrivalTime <= currentTime) {
            readyQueue.push(process);
        }
    });
    
    while (completedProcesses.size < remainingProcesses.length) {
        if (readyQueue.length === 0) {
            currentTime++;
            // Check for new arrivals
            remainingProcesses.forEach(process => {
                if (!completedProcesses.has(process) && 
                    !readyQueue.includes(process) && 
                    process.arrivalTime <= currentTime) {
                    readyQueue.push(process);
                }
            });
            continue;
        }
        
        const currentProcess = readyQueue.shift();
        const executionTime = Math.min(quantum, currentProcess.remainingTime);
        
        // Update waiting time
        if (currentProcess.lastExecutionEnd > 0) {
            currentProcess.waitingTime += currentTime - currentProcess.lastExecutionEnd;
        } else {
            currentProcess.waitingTime += currentTime - currentProcess.arrivalTime;
        }
        
        schedule.push({
            process: currentProcess,
            startTime: currentTime,
            endTime: currentTime + executionTime
        });
        
        currentProcess.remainingTime -= executionTime;
        currentTime += executionTime;
        currentProcess.lastExecutionEnd = currentTime;
        
        // Check for new arrivals during execution
        remainingProcesses.forEach(process => {
            if (!completedProcesses.has(process) && 
                !readyQueue.includes(process) && 
                process.arrivalTime <= currentTime) {
                readyQueue.push(process);
            }
        });
        
        if (currentProcess.remainingTime > 0) {
            readyQueue.push(currentProcess);
        } else {
            currentProcess.completionTime = currentTime;
            currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
            completedProcesses.add(currentProcess);
        }
    }
    
    // Update the original process list with calculated times
    remainingProcesses.forEach(process => {
        const originalProcess = processList.find(p => p.id === process.id);
        if (originalProcess) {
            originalProcess.waitingTime = process.waitingTime;
            originalProcess.turnaroundTime = process.turnaroundTime;
            originalProcess.completionTime = process.completionTime;
        }
    });
    
    return schedule;
}

function priorityScheduling(processList = processes) {
    const schedule = [];
    let currentTime = 0;
    const readyQueue = [];
    const completedProcesses = new Set();
    const remainingProcesses = [...processList];
    
    while (completedProcesses.size < remainingProcesses.length) {
        // Add processes that have arrived to ready queue
        remainingProcesses.forEach(process => {
            if (!completedProcesses.has(process) && 
                !readyQueue.includes(process) && 
                process.arrivalTime <= currentTime) {
                readyQueue.push(process);
            }
        });
        
        if (readyQueue.length === 0) {
            currentTime++;
            continue;
        }
        
        // Sort ready queue by priority (lower number = higher priority)
        readyQueue.sort((a, b) => a.priority - b.priority);
        
        const currentProcess = readyQueue.shift();
        schedule.push({
            process: currentProcess,
            startTime: currentTime,
            endTime: currentTime + currentProcess.burstTime
        });
        
        currentProcess.completionTime = currentTime + currentProcess.burstTime;
        currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
        currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
        
        currentTime += currentProcess.burstTime;
        completedProcesses.add(currentProcess);
    }
    
    return schedule;
}

// Visualization Functions
function drawGanttChart(schedule) {
    const ganttContainer = document.querySelector('.gantt-chart-container');
    // Clear previous content
    ganttContainer.innerHTML = `
        <h3 class="gantt-chart-title">Process Execution Timeline</h3>
        <div class="gantt-legend"></div>
        <div id="gantt-chart"></div>
    `;

    const ganttChart = document.getElementById('gantt-chart');
    const totalTime = schedule[schedule.length - 1].endTime;
    const scale = 100 / totalTime;
    
    // Create grid lines and time markers
    const gridContainer = document.createElement('div');
    gridContainer.className = 'gantt-grid';
    
    // Add time markers every unit of time
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';
    
    for (let i = 0; i <= totalTime; i++) {
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.style.left = `${i * scale}%`;
        marker.textContent = i;
        timelineHeader.appendChild(marker);
        
        const gridLine = document.createElement('div');
        gridLine.className = 'grid-line';
        gridLine.style.left = `${i * scale}%`;
        gridContainer.appendChild(gridLine);
    }
    
    ganttChart.appendChild(timelineHeader);
    ganttChart.appendChild(gridContainer);
    
    // Create legend
    const legend = document.querySelector('.gantt-legend');
    const processColors = new Map();
    
    schedule.forEach((entry, index) => {
        if (!processColors.has(entry.process.id)) {
            processColors.set(entry.process.id, colors[processColors.size % colors.length]);
        }
    });
    
    processColors.forEach((color, processId) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${color}; width: 20px; height: 20px; margin-right: 8px; border-radius: 3px; border: 1px solid #ccc;"></div>
            <span>${processId}</span>
        `;
        legend.appendChild(legendItem);
    });
    
    // Create Gantt blocks
    schedule.forEach((entry, index) => {
        const block = document.createElement('div');
        block.className = 'gantt-block';
        block.style.width = `${(entry.endTime - entry.startTime) * scale}%`;
        block.style.backgroundColor = processColors.get(entry.process.id);
        block.style.left = `${entry.startTime * scale}%`;
        
        // Add process label
        const label = document.createElement('span');
        label.className = 'process-label';
        label.textContent = entry.process.id;
        block.appendChild(label);
        
        // Add time labels
        const timeLabel = document.createElement('span');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${entry.startTime} - ${entry.endTime}`;
        block.appendChild(timeLabel);
        
        // Add process state indicator
        const stateIndicator = document.createElement('div');
        stateIndicator.className = 'process-state';
        
        // Determine the state based on current time and process arrival time
        if (currentTime < entry.process.arrivalTime) {
            stateIndicator.classList.add('state-not-arrived');
        } else if (index === currentExecutionIndex) {
            stateIndicator.classList.add('state-running');
        } else if (index < currentExecutionIndex) {
            stateIndicator.classList.add('state-completed');
        } else {
            stateIndicator.classList.add('state-waiting');
        }
        
        block.appendChild(stateIndicator);
        
        // Add detailed tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `
            <strong>${entry.process.id}</strong><br>
            Start Time: ${entry.startTime}<br>
            End Time: ${entry.endTime}<br>
            Duration: ${entry.endTime - entry.startTime}<br>
            Waiting Time: ${entry.process.waitingTime}<br>
            Turnaround Time: ${entry.process.turnaroundTime}
        `;
        block.appendChild(tooltip);
        
        ganttChart.appendChild(block);
    });
    
    // Add current time marker
    const timeMarker = document.createElement('div');
    timeMarker.className = 'time-marker';
    timeMarker.style.left = '0%';
    ganttChart.appendChild(timeMarker);
}

function displayResults(schedule) {
    const resultsBody = document.getElementById('results-body');
    const summaryStats = document.getElementById('summary-stats');
    
    resultsBody.innerHTML = '';
    summaryStats.innerHTML = '';
    
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    
    processes.forEach((process, index) => {
        setTimeout(() => {
            const row = document.createElement('tr');
            row.className = 'fade-in';
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.completionTime}</td>
                <td>${process.turnaroundTime}</td>
                <td>${process.waitingTime}</td>
            `;
            resultsBody.appendChild(row);
        }, index * 100);
        
        totalWaitingTime += process.waitingTime;
        totalTurnaroundTime += process.turnaroundTime;
    });
    
    // Animated summary statistics
    setTimeout(() => {
        const avgWaitingTime = totalWaitingTime / processes.length;
        const avgTurnaroundTime = totalTurnaroundTime / processes.length;
        
        summaryStats.innerHTML = `
            <div class="stat-item fade-in">
                <i class="fas fa-clock"></i>
                <p>Average Waiting Time: <span class="highlight">${avgWaitingTime.toFixed(2)}</span></p>
            </div>
            <div class="stat-item fade-in">
                <i class="fas fa-history"></i>
                <p>Average Turnaround Time: <span class="highlight">${avgTurnaroundTime.toFixed(2)}</span></p>
            </div>
        `;
    }, processes.length * 100);
}

// Process Inspector Modal
function showProcessDetails(process) {
    const modal = document.getElementById('process-modal');
    modal.classList.add('fade-in');
    
    // Update modal content with animations
    const fields = [
        { id: 'modal-process-id', value: process.id },
        { id: 'modal-arrival-time', value: process.arrivalTime },
        { id: 'modal-burst-time', value: process.burstTime },
        { id: 'modal-start-time', value: process.startTime || 'N/A' },
        { id: 'modal-completion-time', value: process.completionTime },
        { id: 'modal-turnaround-time', value: process.turnaroundTime },
        { id: 'modal-waiting-time', value: process.waitingTime }
    ];
    
    fields.forEach((field, index) => {
        setTimeout(() => {
            const element = document.getElementById(field.id);
            element.textContent = field.value;
            element.classList.add('pop-in');
        }, index * 100);
    });
    
    modal.style.display = 'block';
}

// Add this function for calculating metrics
function calculateMetrics(schedule) {
    if (!schedule || schedule.length === 0) return null;

    // Calculate total execution time
    const totalTime = schedule[schedule.length - 1].endTime;
    
    // Calculate throughput (processes per unit time)
    const uniqueProcesses = new Set(schedule.map(entry => entry.process.id)).size;
    const throughput = uniqueProcesses / totalTime;
    
    // Calculate context switches (number of process changes)
    let contextSwitches = 0;
    for (let i = 1; i < schedule.length; i++) {
        if (schedule[i].process.id !== schedule[i-1].process.id) {
            contextSwitches++;
        }
    }
    
    // Calculate CPU utilization (percentage of time CPU is busy)
    const busyTime = schedule.reduce((total, entry) => 
        total + (entry.endTime - entry.startTime), 0);
    const cpuUtilization = (busyTime / totalTime) * 100;
    
    return {
        throughput,
        contextSwitches,
        cpuUtilization
    };
}

function updatePerformanceDashboard(metrics) {
    if (!metrics) return;
    
    // Update throughput meter
    const throughputMeter = document.getElementById('throughputMeter');
    if (throughputMeter) {
        throughputMeter.innerHTML = `
            <div class="metric-value">${metrics.throughput.toFixed(2)}</div>
            <div class="metric-label">processes/unit time</div>
        `;
    }
    
    // Update context switches
    const contextSwitches = document.getElementById('contextSwitches');
    if (contextSwitches) {
        contextSwitches.innerHTML = `
            <div class="metric-value">${metrics.contextSwitches}</div>
            <div class="metric-label">switches</div>
        `;
    }
    
    // Update CPU utilization
    const cpuUtilization = document.getElementById('cpuUtilization');
    if (cpuUtilization) {
        cpuUtilization.innerHTML = `
            <div class="metric-value">${metrics.cpuUtilization.toFixed(1)}%</div>
            <div class="metric-label">utilization</div>
        `;
    }
}

// Fix the compareAlgorithms function
function compareAlgorithms() {
    getProcessData(); // Get current process data
    if (processes.length === 0) {
        alert('Please add at least one process');
        return;
    }

    const algorithms = ['fcfs', 'sjf', 'rr', 'priority'];
    const results = {};
    
    // Clear previous results
    document.getElementById('avgWaitingComparison').innerHTML = '<h3>Average Waiting Time</h3>';
    document.getElementById('avgTurnaroundComparison').innerHTML = '<h3>Average Turnaround Time</h3>';
    document.getElementById('cpuUtilizationComparison').innerHTML = '<h3>CPU Utilization</h3>';
    
    algorithms.forEach(algo => {
        try {
            // Create a deep copy of processes for each algorithm
            const processesCopy = processes.map(p => new Process(p.id, p.arrivalTime, p.burstTime, p.priority));
            let schedule;
            
            switch(algo) {
                case 'fcfs':
                    schedule = fcfs(processesCopy);
                    break;
                case 'sjf':
                    schedule = sjf(processesCopy);
                    break;
                case 'rr':
                    const quantum = parseInt(document.getElementById('time-quantum').value) || 2;
                    schedule = roundRobin(quantum, processesCopy);
                    break;
                case 'priority':
                    schedule = priorityScheduling(processesCopy);
                    break;
            }
            
            if (schedule && schedule.length > 0) {
                // Calculate metrics for this algorithm
                const metrics = calculateMetrics(schedule);
                
                // Calculate average waiting and turnaround times
                const avgWaitingTime = processesCopy.reduce((sum, p) => sum + p.waitingTime, 0) / processesCopy.length;
                const avgTurnaroundTime = processesCopy.reduce((sum, p) => sum + p.turnaroundTime, 0) / processesCopy.length;
                
                results[algo.toUpperCase()] = {
                    ...metrics,
                    avgWaitingTime,
                    avgTurnaroundTime
                };
            }
        } catch (error) {
            console.error(`Error in ${algo} algorithm:`, error);
        }
    });
    
    updateComparisonCharts(results);

    // Scroll to comparison section with smooth animation
    const comparisonSection = document.querySelector('.comparison-section');
    comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add highlight animation to the comparison section
    comparisonSection.classList.add('highlight-section');
    setTimeout(() => {
        comparisonSection.classList.remove('highlight-section');
    }, 1500);
}

// Update the updateComparisonCharts function
function updateComparisonCharts(results) {
    const ctx = document.getElementById('comparisonChart');
    
    // Destroy existing chart if it exists
    if (window.comparisonChart instanceof Chart) {
        window.comparisonChart.destroy();
    }
    
    // Create new chart
    window.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(results),
            datasets: [{
                label: 'Average Waiting Time',
                data: Object.values(results).map(r => r.avgWaitingTime),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'Average Turnaround Time',
                data: Object.values(results).map(r => r.avgTurnaroundTime),
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time Units'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Algorithm Performance Comparison',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Update metrics cards
    updateMetricsCards(results);
}

// Update the updateMetricsCards function
function updateMetricsCards(results) {
    const avgWaiting = document.getElementById('avgWaitingComparison');
    const avgTurnaround = document.getElementById('avgTurnaroundComparison');
    const cpuUtil = document.getElementById('cpuUtilizationComparison');
    
    // Create and update metrics visualizations
    Object.entries(results).forEach(([algo, metrics]) => {
        avgWaiting.innerHTML += `
            <div class="metric-item glass-effect">
                <span class="algo-name">${algo}</span>
                <span class="metric-value">${metrics.avgWaitingTime.toFixed(2)}</span>
            </div>
        `;
        
        avgTurnaround.innerHTML += `
            <div class="metric-item glass-effect">
                <span class="algo-name">${algo}</span>
                <span class="metric-value">${metrics.avgTurnaroundTime.toFixed(2)}</span>
            </div>
        `;
        
        cpuUtil.innerHTML += `
            <div class="metric-item glass-effect">
                <span class="algo-name">${algo}</span>
                <span class="metric-value">${metrics.cpuUtilization.toFixed(2)}%</span>
            </div>
        `;
    });
}

// Educational Features
function initializeEducationalFeatures() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    initializeQuiz();
}

function initializeQuiz() {
    const questions = [
        {
            question: "Which scheduling algorithm is best for minimizing average waiting time?",
            options: ["FCFS", "SJF", "RR", "Priority"],
            correct: "SJF"
        },
        {
            question: "What problem can occur in Priority Scheduling?",
            options: ["Convoy Effect", "Starvation", "Aging", "Deadlock"],
            correct: "Starvation"
        },
        // Add more questions
    ];
    
    let currentQuestion = 0;
    
    function showQuestion() {
        const quizContent = document.getElementById('quizContent');
        const question = questions[currentQuestion];
        
        quizContent.innerHTML = `
            <div class="question">${question.question}</div>
            <div class="options">
                ${question.options.map(option => `
                    <button class="option-btn" onclick="checkAnswer('${option}')">${option}</button>
                `).join('')}
            </div>
        `;
    }
    
    document.getElementById('nextQuestion').addEventListener('click', () => {
        currentQuestion = (currentQuestion + 1) % questions.length;
        showQuestion();
    });
    
    showQuestion();
}

// Export Features
function showExportModal() {
    const exportModal = document.getElementById('exportModal');
    exportModal.style.display = 'block';

    // Add event listener for the close button
    const closeBtn = exportModal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = function() {
            exportModal.style.display = 'none';
        };
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === exportModal) {
            exportModal.style.display = 'none';
        }
    };
}

function exportToPDF() {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Process Scheduling Results', 20, 20);
    
    // Add process table
    const processes = getProcesses();
    let y = 40;
    processes.forEach((process, index) => {
        doc.text(`Process ${process.id}:`, 20, y);
        doc.text(`Waiting Time: ${process.waitingTime}`, 80, y);
        doc.text(`Turnaround Time: ${process.turnaroundTime}`, 140, y);
        y += 10;
    });
    
    // Add Gantt chart (simplified)
    y += 20;
    doc.text('Gantt Chart:', 20, y);
    
    // Save the PDF
    doc.save('process-scheduling-results.pdf');
}

function exportToExcel() {
    const processes = getProcesses();
    const ws = XLSX.utils.json_to_sheet(processes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Processes");
    XLSX.writeFile(wb, 'process-scheduling-results.xlsx');
}

function saveConfiguration() {
    const config = {
        processes: getProcesses(),
        algorithm: document.getElementById('algorithm').value,
        quantum: document.getElementById('quantum').value
    };
    
    const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scheduling-config.json';
    a.click();
}

function resetSimulation() {
    // Reset all global variables
    processes = [];
    processCounter = 1;
    currentSchedule = [];
    currentExecutionIndex = 0;
    currentTime = 0;
    isPlaying = false;

    // Clear intervals
    if (executionInterval) clearInterval(executionInterval);
    if (timelineInterval) clearInterval(timelineInterval);
    executionInterval = null;
    timelineInterval = null;

    // Reset algorithm selection
    const algorithmBlocks = document.querySelectorAll('.algorithm-block');
    algorithmBlocks.forEach(block => block.classList.remove('active'));
    const defaultAlgorithm = document.querySelector('.algorithm-block[data-algorithm="fcfs"]');
    if (defaultAlgorithm) defaultAlgorithm.classList.add('active');
    document.getElementById('algorithm').value = 'fcfs';

    // Reset time quantum input
    const timeQuantumInput = document.getElementById('time-quantum');
    timeQuantumInput.value = '2';
    timeQuantumInput.parentElement.classList.remove('show');

    // Clear process list and add one empty row
    const processList = document.getElementById('process-list');
    processList.innerHTML = '';
    addProcessRow();

    // Reset visualization areas
    const ganttChart = document.getElementById('gantt-chart');
    ganttChart.innerHTML = '';
    
    const resultsBody = document.getElementById('results-body');
    resultsBody.innerHTML = '';

    // Reset timeline slider
    const timelineSlider = document.getElementById('timeline-slider');
    if (timelineSlider) {
        timelineSlider.value = 0;
        timelineSlider.max = 0;
    }

    // Reset performance dashboard
    document.getElementById('avg-waiting-time').textContent = '0';
    document.getElementById('avg-turnaround-time').textContent = '0';
    document.getElementById('cpu-utilization').textContent = '0%';

    // Reset button states
    const playTimelineBtn = document.getElementById('playTimeline');
    const pauseTimelineBtn = document.getElementById('pauseTimeline');
    if (playTimelineBtn) playTimelineBtn.style.display = 'inline-block';
    if (pauseTimelineBtn) pauseTimelineBtn.style.display = 'none';

    // Reset comparison charts if they exist
    const comparisonChartsDiv = document.getElementById('comparison-charts');
    if (comparisonChartsDiv) comparisonChartsDiv.innerHTML = '';

    // Show success message
    showMessage('Simulation reset successfully!', 'success');
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type} show`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Initialize features when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTimeline();
    initializeEducationalFeatures();
}); 
