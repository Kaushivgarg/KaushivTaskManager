const request = indexedDB.open("TodoDB", 2);

let db;

request.onsuccess = (event) => {
    db = event.target.result;
    loadTasks();
};

request.onerror = (event) => {
    console.error("Database error:", event.target.errorCode);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("tasks")) {
        const objectStore = db.createObjectStore("tasks", {
            keyPath: "id",
            autoIncrement: true,
        });

        objectStore.createIndex("done", "done", { unique: false });
        objectStore.createIndex("timestamp", "timestamp", { unique: false });
        objectStore.createIndex("category", "category", { unique: false });
        objectStore.createIndex("priority", "priority", { unique: false });
    }
};

document.getElementById("todoForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const taskText = document.getElementById("taskInput").value.trim();
    const category = document.getElementById("categorySelect").value;
    const priority = document.getElementById("prioritySelect").value;

    if (taskText === "") return;

    const task = {
        text: taskText,
        done: false,
        timestamp: Date.now(),
        category: category,
        priority: priority,
    };

    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.add(task);

    e.target.reset();
    loadTasks();
});

function loadTasks() {
    const taskList = document.getElementById("taskList");
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    const sortSelect = document.getElementById("sortSelect").value;

    taskList.innerHTML = "";

    const tasksArray = [];

    const objectStore = db.transaction("tasks").objectStore("tasks");
    objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const task = cursor.value;
            if (task.text.toLowerCase().includes(searchInput)) {
                tasksArray.push(task);
            }
            cursor.continue();
        } else {
            sortTasks(tasksArray, sortSelect);
            renderTasks(taskList, tasksArray);
        }
    };
}

function sortTasks(tasks, criteria) {
    tasks.sort((a, b) => {
        if (criteria === "date") {
            return a.timestamp - b.timestamp;
        } else if (criteria === "priority") {
            const priorities = { low: 1, medium: 2, high: 3 };
            return priorities[b.priority] - priorities[a.priority];
        } else if (criteria === "category") {
            return a.category.localeCompare(b.category);
        }
    });
}

function renderTasks(tableBody, tasks) {
    tasks.forEach(task => {
        const row = document.createElement("tr");
        const taskTextCell = document.createElement("td");
        const taskDoneCell = document.createElement("td");
        const taskDueTimeCell = document.createElement("td");
        const taskCategoryCell = document.createElement("td");  // New cell
        const taskPriorityCell = document.createElement("td");  // New cell
        const taskEditCell = document.createElement("td");
        const taskDeleteCell = document.createElement("td");
        const dueTimeCell = document.createElement("td");
        taskTextCell.id = `name-${task.id}`;
        taskTextCell.textContent = task.text;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.className = "hidden-checkbox"; // Using the CSS class we provided earlier

        const label = document.createElement("label");
        label.className = "custom-checkbox";

        const icon = document.createElement("span");
        icon.className = "icon";

        label.appendChild(checkbox);
        label.appendChild(icon);

        checkbox.addEventListener("change", () => toggleDone(task.id, checkbox));

        taskDoneCell.appendChild(label);
        if (task.dueTime) {
            const timeLeft = (task.dueTime - Date.now()) / 1000;
            const formattedTime = timeLeft > 0 ? formatTime(timeLeft) : "Completed";
            taskDueTimeCell.textContent = formattedTime;
        } else {
            taskDueTimeCell.textContent = 'Not set';
        }
        taskDueTimeCell.id = `time-${task.id}`;

        taskCategoryCell.textContent = task.category; // New line
        taskPriorityCell.textContent = task.priority; // New line

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.id=`taskText-${task.id}`
        editButton.addEventListener("click", () => editTask(task.id));
        taskEditCell.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => removeTask(task.id));
        taskDeleteCell.appendChild(deleteButton);


        const dueTimeInput = document.createElement("input");
        dueTimeInput.type = "datetime-local";
        dueTimeInput.id = `dueTime-${task.id}`;
        dueTimeInput.setAttribute("onchange", `setDueTime(${task.id}, this)`);
        if (task.dueTime) {
            dueTimeInput.value = formatDate(task.dueTime);
        }
        dueTimeCell.appendChild(dueTimeInput);
        row.appendChild(taskDoneCell);
        row.appendChild(taskTextCell);
        row.appendChild(dueTimeCell);  // New append
        row.appendChild(taskDueTimeCell);
        row.appendChild(taskCategoryCell);  // New append
        row.appendChild(taskPriorityCell);  // New append
        row.appendChild(taskEditCell);
        row.appendChild(taskDeleteCell);
        tableBody.appendChild(row);
    });
}



//... The rest of your functions ...




function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = parseInt(seconds % 60);
    if (minutes == 0) return `${remainingSeconds}s`
    else if (hours == 0) return `${minutes}m ${remainingSeconds}s`
    else return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toggleDone(taskId, checkbox) {
    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.get(taskId).onsuccess = (event) => {
        const task = event.target.result;
        task.done = checkbox.checked;
        objectStore.put(task);
        loadTasks();
    };
}

function removeTask(taskId) {
    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");
    objectStore.delete(taskId);
    loadTasks();
}

function editTask(taskId) {
    const transaction = db.transaction("tasks", "readwrite");
    const objectStore = transaction.objectStore("tasks");

    const taskTextSpan = document.getElementById(`name-${taskId}`);
    const newText = prompt("Edit task:", taskTextSpan.textContent);

    if (newText !== null && newText.trim() !== "") {
        objectStore.get(taskId).onsuccess = (event) => {
            const task = event.target.result;
            task.text = newText;
            objectStore.put(task);
            taskTextSpan.textContent = newText;
        };
    }
}
function setDueTime(taskId, input) {
    const dueTime = new Date(input.value).getTime();
    if (!isNaN(dueTime)) {
        const transaction = db.transaction("tasks", "readwrite");
        const objectStore = transaction.objectStore("tasks");
        objectStore.get(taskId).onsuccess = (event) => {
            const task = event.target.result;
            task.dueTime = dueTime;
            objectStore.put(task);
            loadTasks();
        };
    }
}

function checkDueTasks() {
    const currentTime = Date.now();
    const objectStore = db.transaction("tasks", "readwrite").objectStore("tasks");
    objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const task = cursor.value;
            const timeLeftCell = document.getElementById(`time-${task.id}`);
            if (task.dueTime) {
                const timeLeft = (task.dueTime - Date.now()) / 1000;
                const formattedTime = timeLeft > 0 ? formatTime(timeLeft) : "Completed";
                timeLeftCell.textContent = `${formattedTime}`;
                if (!task.done && task.dueTime <= currentTime) {
                    const confirmed = confirm(
                        `Task "${task.text}" is due now!\nMark as done?`
                    );
                    if (confirmed) {
                        task.done = true;
                        objectStore.put(task);
                        loadTasks();
                    }
                }
            } else {
                timeLeftCell.textContent = 'Not set';
            }
            cursor.continue();
        }
    };
}

setInterval(checkDueTasks, 1000);