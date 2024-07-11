var selected_student = "سعد صالح احمد محمد";
var naming_maps = {};
var student_classes = [];

frappe.pages['student-portal'].on_page_load = async function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Student Portal',
        single_column: true
    });
    var main_template = frappe.render_template('student_portal', {
        teacher_name: "test"
    }, page.main);
    var $container = $(wrapper).find('.layout-main-section');
    $container.html(main_template);

    // await get_current_user_student();
    await get_classes();
    await content_manager();
}
async function get_classes() {

    let response = await frappe.call({
        method: 'kalima.utils.utils.get_student_classes',
        args:
        {
            student_name: selected_student
        }
    });
    if (response.message) {
        student_classes = response.message;
    }
}


async function content_manager(dont_click = false) {
    var contentColumn = document.querySelector("#content");
    document.querySelectorAll('.btn-secondary').forEach(button => {
        button.addEventListener('click', async function () {
            document.querySelectorAll('.btn-secondary').forEach(btn => {
                btn.classList.remove('btn-info');
                btn.classList.remove('active');
            });
            this.classList.add('btn-info');
            this.classList.add('active');

            contentColumn.innerHTML = ''; // Clear the content column
            var templateName = "basic";
            var template = this.textContent.replace(/\s+/g, '-').toLowerCase();
            var cnt = frappe.render_template(templateName, {}, contentColumn);
            contentColumn.innerHTML = cnt;

            if (template === 'attendance') {
                const columns = [
                    { label: 'Date', fieldname: 'date' },
                    { label: 'Module', fieldname: 'module' },
                    { label: 'Status', fieldname: 'status' },
                    { label: 'Leave', fieldname: 'leave' }
                ];
                await attendance(contentColumn, columns);
            }


            if (template === 'exam-results') {
                await exam_results(contentColumn);
            }

            if (template === 'lecture-schedule') {
                const columns = [
                    { label: 'Class', fieldname: 'class' },
                    { label: 'Module', fieldname: 'module' },
                    { label: 'Day', fieldname: 'day' },
                    { label: 'Start', fieldname: 'start' },
                    { label: 'Finish', fieldname: 'finish' }
                ];
                await populateTableNew('Class Timetable', contentColumn,columns);
            }

            if (template === 'modules') {
                const columns = [
                    { label: 'Class', fieldname: 'class' },
                    { label: 'Title', fieldname: 'title' },
                    { label: 'Module', fieldname: 'module' },
                    { label: 'Description', fieldname: 'description' },
                    { label: 'Session files', fieldname: 'session_files' },
                ];
                // await populateTable('Class Session', contentColumn, columns);
                await populateCards('Class Session', contentColumn, columns);

            }
            if (template === 'tasks') {
                await populateTable('Exam Schedule', contentColumn, columns);
            }

        });
    });

    if (!dont_click) {
        document.querySelectorAll('.first-button').forEach(btn => {
            btn.click();
        });
    }
}

async function populateTable(doctype, container, columns) {
    // Fetch data from Frappe
    const data = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: doctype,
            filters: {
                'class': ['in', student_classes]
            },
            fields: ['name', ...columns.map(col => col.fieldname)],
            // limit_page_length: 15
        }
    });


    // Create table elements
    const table = document.createElement('table');
    table.classList.add('table', 'border', 'rounded', 'table-hover');
    table.style.borderRadius = '30px';  // Adjust the value as needed

    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = "#";
    tr.appendChild(th);

    // Create table header
    columns.forEach(col => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = col.label;
        tr.appendChild(th);
    });


    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    // Populate table rows
    data.message.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('clickable-row');

        tr.addEventListener('click', () => {
            frappe.open_in_new_tab = true;
            frappe.set_route(`/app/${toKebabCase(doctype)}/${row.name}`);
        });

        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = index + 1;
        tr.appendChild(th);

        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col.fieldname] || '';
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

async function populateTableNew(doctype, container, columns) {
    // Fetch data from Frappe
    const data = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: doctype,
            filters: {
                'class': ['in', student_classes]
            },
            fields: ['module', 'name', ...columns.map(col => col.fieldname)],
            // limit_page_length: 15
        }
    });

    console.log("data");
    console.log(data);

    // Group data by module
    const groupedData = data.message.reduce((acc, row) => {
        const module = row.module || 'Unknown Module'; // Handle cases where module is null
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(row);
        return acc;
    }, {});

    // Generate a unique identifier for each module
    let moduleCounter = 0;

    for (const [module, records] of Object.entries(groupedData)) {
        moduleCounter++;

        // Create collapse button
        const collapseButton = document.createElement('button');
        collapseButton.className = 'btn btn-primary my-2';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-toggle', 'collapse');
        collapseButton.setAttribute('data-target', `#collapseModule${moduleCounter}`);
        collapseButton.setAttribute('aria-expanded', 'false');
        collapseButton.setAttribute('aria-controls', `collapseModule${moduleCounter}`);
        collapseButton.innerHTML = `${module} <span class="bi bi-chevron-down"></span>`;

        // Create collapse container
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'collapse';
        collapseContainer.id = `collapseModule${moduleCounter}`;

        // Create table for each module
        const table = document.createElement('table');
        table.classList.add('table', 'border', 'rounded', 'table-hover');
        table.style.borderRadius = '30px';  // Adjust the value as needed

        const thead = document.createElement('thead');
        const tr = document.createElement('tr');

        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = "#";
        tr.appendChild(th);

        // Create table header
        columns.forEach(col => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = col.label;
            tr.appendChild(th);
        });


        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Populate table rows
        records.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.classList.add('clickable-row');

            tr.addEventListener('click', () => {
                frappe.open_in_new_tab = true;
                frappe.set_route(`/app/${toKebabCase(doctype)}/${row.name}`);
            });

            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = index + 1;
            tr.appendChild(th);

            columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col.fieldname] || '';
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        collapseContainer.appendChild(table);

        // Append elements to the container
        container.appendChild(collapseButton);
        container.appendChild(document.createElement('br'));
        container.appendChild(collapseContainer);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createElement('br'));
    }
}

async function populateCards2(doctype, container, columns) {
    // Fetch data from Frappe
    const data = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: doctype,
            filters: {
                'class': ['in', student_classes]
            },
            fields: ['name', 'description', ...columns.map(col => col.fieldname)],
        }
    });

    const groupedData = data.message.reduce((acc, row) => {
        const module = row.module || 'Unknown Module'; // Handle cases where module is null
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(row);
        return acc;
    }, {});
    // Generate a unique identifier for each group
    let groupCounter = 0;

    for (const [group, records] of Object.entries(groupedData)) {
        groupCounter++;

        // Create collapse button
        const collapseButton = document.createElement('button');
        collapseButton.className = 'btn btn-primary my-2';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-toggle', 'collapse');
        collapseButton.setAttribute('data-target', `#collapseGroup${groupCounter}`);
        collapseButton.setAttribute('aria-expanded', 'false');
        collapseButton.setAttribute('aria-controls', `collapseGroup${groupCounter}`);
        collapseButton.innerHTML = `${group} <span class="bi bi-chevron-down"></span>`;

        // Create collapse container
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'collapse';
        collapseContainer.id = `collapseGroup${groupCounter}`;

        // Create cards for each record
        records.forEach(record => {
            const card = document.createElement('div');
            card.className = 'card mb-3 w-100';
            card.style.border = '1px solid #ddd';
            card.style.borderRadius = '8px';
            card.style.padding = '16px';
            card.style.marginBottom = '16px';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            // Add card title
            const cardTitle = document.createElement('h5');
            cardTitle.className = 'card-title';
            cardTitle.textContent = record.name;
            cardBody.appendChild(cardTitle);

            // Add card content
            columns.forEach(col => {
                const cardText = document.createElement('p');
                cardText.className = 'card-text';
                cardText.innerHTML = `<strong>${col.label}:</strong> ${record[col.fieldname] || ''}`;
                cardBody.appendChild(cardText);
            });

            // Add description field (rendered as HTML)
            if (record.description) {
                const descriptionDiv = document.createElement('div');
                descriptionDiv.className = 'card-text';
                descriptionDiv.innerHTML = record.description;
                cardBody.appendChild(descriptionDiv);
            }

            card.appendChild(cardBody);
            collapseContainer.appendChild(card);
        });

        // Append elements to the container
        container.appendChild(collapseButton);
        container.appendChild(document.createElement('br'));
        container.appendChild(collapseContainer);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createElement('br'));
    }
}


async function populateCards(doctype, container, columns) {
    var data;
    let response = await frappe.call({
        method: 'kalima.utils.utils.get_sessions',
        args:
        {
            student_classes: student_classes
        }
    });
    if (response.message) {
        student_classes = response.message;
        console.log(response.message);
        data = response;
    }

    // Group data by module
    const groupedData = data.message.reduce((acc, row) => {
        const module = row.module || 'Unknown Module'; // Handle cases where module is null
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(row);
        return acc;
    }, {});

    // Generate a unique identifier for each group
    let groupCounter = 0;
    for (const [group, records] of Object.entries(groupedData)) {
        groupCounter++;
    
        // Create collapse button for the module group
        const collapseButton = document.createElement('button');
        collapseButton.className = 'btn btn-primary my-2';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-toggle', 'collapse');
        collapseButton.setAttribute('data-target', `#collapseGroup${groupCounter}`);
        collapseButton.setAttribute('aria-expanded', 'false');
        collapseButton.setAttribute('aria-controls', `collapseGroup${groupCounter}`);
        collapseButton.innerHTML = `${group} <span class="bi bi-chevron-down"></span>`;
    
        // Create collapse container for the module group
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'collapse';
        collapseContainer.id = `collapseGroup${groupCounter}`;
    
        // Create cards for each record within the module group
        records.forEach((record, index) => {
            const cardContainer = document.createElement('div');
            cardContainer.className = 'card mb-3 w-100';
            cardContainer.style.border = '1px solid #ddd';
            cardContainer.style.borderRadius = '8px';
            cardContainer.style.padding = '16px';
            cardContainer.style.marginBottom = '16px';
    
            // Create card header (collapsible button)
            const cardHeader = document.createElement('button');
            cardHeader.className = 'btn btn-link text-left w-100';
            cardHeader.type = 'button';
            cardHeader.setAttribute('data-toggle', 'collapse');
            cardHeader.setAttribute('data-target', `#collapseCard${groupCounter}-${index}`);
            cardHeader.setAttribute('aria-expanded', 'false');
            cardHeader.setAttribute('aria-controls', `collapseCard${groupCounter}-${index}`);
            cardHeader.innerHTML = `${record.title} - ${record.issue_date} <span class="bi bi-chevron-down"></span>`;
    
            // Create card collapse container
            const cardCollapseContainer = document.createElement('div');
            cardCollapseContainer.className = 'collapse';
            cardCollapseContainer.id = `collapseCard${groupCounter}-${index}`;
    
            // Create card body
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
    
            // Add card content
            columns.forEach(col => {
                if (col.fieldname !== 'title' && col.fieldname !== 'issue_date') {
                    if (col.fieldname === 'session_files' && record[col.fieldname]) {
                        const cardText = document.createElement('p');
                        cardText.className = 'card-text';
                        cardText.innerHTML = `<strong>${col.label}:</strong> `;
                        const files = record[col.fieldname];
                        files.forEach(file => {
                            const link = document.createElement('a');
                            link.href = file;
                            link.target = '_blank';
                            link.className = 'btn btn-primary my-1';
                            const fileName = file.split('/').pop();
                            link.textContent = fileName;
                            cardText.appendChild(link);
                            cardText.appendChild(document.createElement('br'));
                        });
                        cardBody.appendChild(cardText);
                    } else {
                        const cardText = document.createElement('p');
                        cardText.className = 'card-text';
                        cardText.innerHTML = `<strong>${col.label}:</strong> ${record[col.fieldname] || ''}`;
                        cardBody.appendChild(cardText);
                    }
                }
            });
    
            cardCollapseContainer.appendChild(cardBody);
            cardContainer.appendChild(cardHeader);
            cardContainer.appendChild(cardCollapseContainer);
            collapseContainer.appendChild(cardContainer);
        });
    
        // Append elements to the container
        container.appendChild(collapseButton);
        container.appendChild(document.createElement('br'));
        container.appendChild(collapseContainer);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createElement('br'));
    }
    
}

async function get_current_user_student() {
    let response = await frappe.call({
        method: 'kalima.utils.utils.get_current_user_student',
    });
    if (response.message) {
        selected_student = response.message.name;
    }
}

async function attendance(container, columns) {
    var data = await frappe.call({
        method: 'kalima.utils.utils.get_student_attendance',
        args: {
            student_name: selected_student
        }
    });

    const groupedData = groupBy(data.message, 'module');

    // Generate a unique identifier for each module
    let moduleCounter = 0;

    for (const [module, records] of Object.entries(groupedData)) {
        moduleCounter++;

        // Create collapse button
        const collapseButton = document.createElement('button');
        const br = document.createElement('br');

        collapseButton.className = 'btn btn-primary';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-toggle', 'collapse');
        collapseButton.setAttribute('data-target', `#collapseModule${moduleCounter}`);
        collapseButton.setAttribute('aria-expanded', 'false');
        collapseButton.setAttribute('aria-controls', `collapseModule${moduleCounter}`);
        collapseButton.innerHTML = module;

        // Create collapse container
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'collapse';
        collapseContainer.id = `collapseModule${moduleCounter}`;

        // Append collapse button and container to the main container
        container.appendChild(collapseButton);
        container.appendChild(collapseContainer);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('br'));

        // Add table to the collapse container
        collapseContainer.appendChild(createTable(records, columns));
    }
}

async function exam_results(container) {
    var data = await frappe.call({
        method: 'kalima.utils.utils.get_student_results',
        args: {
            student_name: selected_student
        }
    });
    console.log(data);

    // Group data by year
    const resultsByYear = data.message.reduce((acc, result) => {
        const year = result.stage || 'Unknown Year'; // Handle cases where year is null
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(result);
        return acc;
    }, {});

    // Sort years in descending order
    const sortedYears = Object.keys(resultsByYear).sort((a, b) => b - a);

    sortedYears.forEach((year, index) => {
        // Create collapse button
        const collapseButton = document.createElement('button');
        collapseButton.className = 'btn btn-primary my-2';
        collapseButton.type = 'button';
        collapseButton.setAttribute('data-toggle', 'collapse');
        collapseButton.setAttribute('data-target', `#collapseYear${index}`);
        collapseButton.setAttribute('aria-expanded', 'false');
        collapseButton.setAttribute('aria-controls', `collapseYear${index}`);
        collapseButton.innerHTML = `${year} <span class="bi bi-chevron-down"></span>`;

        // Create collapse container
        const collapseContainer = document.createElement('div');
        collapseContainer.className = 'collapse';
        collapseContainer.id = `collapseYear${index}`;

        // Create table for each year
        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered my-2';
        table.id = `table-${year}`;

        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create header row
        const headerRow = document.createElement('tr');
        ['Module', 'Round', 'Exam Max Result', 'Result', 'Status', 'Cheating', 'Present'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.className = 'text-center';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create data rows
        resultsByYear[year].forEach(result => {
            const row = document.createElement('tr');
            ['module', 'round', 'exam_max_result', 'result', 'status', 'cheating', 'present'].forEach(key => {
                const td = document.createElement('td');
                td.className = 'text-center';
                if (key === 'cheating' || key === 'present') {
                    td.innerHTML = result[key] ? '<i class="bi bi-check-lg"></i>' : '<i class="bi bi-x-lg"></i>';
                } else {
                    td.textContent = result[key];
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        // Append elements to the container
        container.appendChild(collapseButton);
        container.appendChild(document.createElement('br'));
        collapseContainer.appendChild(table);
        container.appendChild(collapseContainer);
        container.appendChild(document.createElement('br'));
        container.appendChild(document.createElement('hr'));
        container.appendChild(document.createElement('br'));
    });
}

function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
        return result;
    }, {});
}

function createTable(records, columns) {
    const table = document.createElement('table');
    table.classList.add('table', 'border', 'rounded', 'table-hover');

    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = "#";
    tr.appendChild(th);

    columns.forEach(col => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = col.label;
        tr.appendChild(th);
    });

    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    records.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.classList.add('clickable-row');

        tr.addEventListener('click', () => {
            frappe.open_in_new_tab = true;
            frappe.set_route(`/app/student-attendance-entry/${row.name}`);
        });

        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = index + 1;
        tr.appendChild(th);

        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col.fieldname] || '';
            if (col.fieldname === 'leave') {
                td.textContent = row[col.fieldname] ? "Yes" : "No";
            }
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}




function toKebabCase(str) {
    return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
}
