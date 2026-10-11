const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxChts7ISvoh-XhikVyEbKwL9fsTgkdbTKXpiFQx0G7hvoUFWay0RlYsml3kU3vviA/exec";
let currentAuthMode = 'login';
let loggedInUserEmail = "";

// Modal Handlers
function openModal(mode) {
    currentAuthMode = mode;
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('modal-title').innerText = mode === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('authSubmitBtn').innerText = mode === 'login' ? 'Sign In' : 'Sign Up';
    
    document.getElementById('nameGroup').style.display = mode === 'signup' ? 'block' : 'none';
    document.getElementById('roleGroup').style.display = mode === 'signup' ? 'block' : 'none';
    
    toggleRoleFields();
}

function closeModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('auth-msg').innerText = '';
}

function toggleRoleFields() {
    const role = document.getElementById('authRole').value;
    const workerFields = document.getElementById('workerFields');
    const clientFields = document.getElementById('clientFields');

    if (currentAuthMode === 'signup') {
        if (role === 'worker') {
            workerFields.style.display = 'block';
            clientFields.style.display = 'none';
        } else {
            workerFields.style.display = 'none';
            clientFields.style.display = 'block';
        }
    } else {
        workerFields.style.display = 'none';
        clientFields.style.display = 'none';
    }
}

// Convert File to Base64 String
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Sign In & Sign Up Form Handling
document.getElementById('authForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('authSubmitBtn');
    const msg = document.getElementById('auth-msg');

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";
    msg.innerText = "";

    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    let payload = { action: currentAuthMode, email: email, password: password };

    if (currentAuthMode === 'signup') {
        payload.fullName = document.getElementById('authName').value;
        payload.role = document.getElementById('authRole').value;

        if (payload.role === 'worker') {
            payload.skills = document.getElementById('authSkills').value;
            payload.experience = document.getElementById('authExp').value;
            
            const fileInput = document.getElementById('authResume');
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                payload.resumeBase64 = await fileToBase64(file);
                payload.resumeFileName = file.name;
            }
        } else {
            payload.company = document.getElementById('authCompany').value;
        }
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.status === 'success') {
            msg.style.color = "green";
            if (currentAuthMode === 'signup') {
                msg.innerText = "Signup Successful! Please Sign In.";
                setTimeout(() => openModal('login'), 1500);
            } else {
                msg.innerText = "Login Successful!";
                loggedInUserEmail = result.email || email;
                setTimeout(() => {
                    closeModal();
                    loadDashboard(loggedInUserEmail, result.role, result.skills || "");
                }, 1000);
            }
        } else {
            msg.style.color = "red";
            msg.innerText = result.message || "Invalid Email or Password!";
        }
    } catch (err) {
        msg.style.color = "red";
        msg.innerText = "Connection Error!";
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = currentAuthMode === 'login' ? 'Sign In' : 'Sign Up';
    }
});

// Load Dashboard
function loadDashboard(email, role, skills) {
    document.getElementById('hero-section').style.display = 'none';
    document.getElementById('about-section').style.display = 'none';
    document.getElementById('nav-auth-btns').style.display = 'none';
    document.getElementById('nav-user-info').style.display = 'flex';
    document.getElementById('welcome-user').innerText = `Welcome, ${email} (${role.toUpperCase()})`;

    if (role === 'client') {
        document.getElementById('client-dashboard').style.display = 'block';
        document.getElementById('worker-dashboard').style.display = 'none';
        loadClientWorkers();
        loadClientApplications();
    } else {
        document.getElementById('worker-dashboard').style.display = 'block';
        document.getElementById('client-dashboard').style.display = 'none';
        
        const skillBadge = document.getElementById('worker-skills-badge');
        if(skillBadge) skillBadge.innerText = skills || "No skills added";
        
        fetchJobsAndMatch(skills || ""); 
    }
}

function logout() {
    document.getElementById('hero-section').style.display = 'flex';
    document.getElementById('about-section').style.display = 'block';
    document.getElementById('nav-auth-btns').style.display = 'block';
    document.getElementById('nav-user-info').style.display = 'none';
    document.getElementById('worker-dashboard').style.display = 'none';
    document.getElementById('client-dashboard').style.display = 'none';
    loggedInUserEmail = "";
}

// Post Job Handler (Client)
const postJobForm = document.getElementById('postJobForm');
if (postJobForm) {
    postJobForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const msg = document.getElementById('job-msg');
        const submitBtn = postJobForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        msg.innerText = "Posting Job...";

        const payload = {
            action: 'postJob',
            email: loggedInUserEmail,
            company: document.getElementById('jobCompany').value,
            jobTitle: document.getElementById('jobTitle').value,
            skillsNeeded: document.getElementById('jobSkills').value,
            description: document.getElementById('jobDesc').value
        };

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status === 'success') {
                msg.style.color = "green";
                msg.innerText = "Job Posted Successfully!";
                postJobForm.reset();
            } else {
                msg.style.color = "red";
                msg.innerText = "Failed to post job.";
            }
        } catch (err) {
            msg.style.color = "red";
            msg.innerText = "Error posting job.";
            console.error(err);
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Load Available Workers for Client
function loadClientWorkers() {
    const workersBox = document.getElementById('workers-list');
    if (!workersBox) return;

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getWorkers' })
    })
    .then(res => res.json())
    .then(workers => {
        workersBox.innerHTML = '';
        if (!Array.isArray(workers) || workers.length === 0) {
            workersBox.innerHTML = '<p>No workers registered yet.</p>';
            return;
        }

        workers.forEach(worker => {
            workersBox.innerHTML += `
                <div class="job-card">
                    <h4><i class="fa-solid fa-user-tie"></i> ${worker.fullName || 'Worker'}</h4>
                    <div class="company"><i class="fa-solid fa-envelope"></i> ${worker.email}</div>
                    <div class="skills">Skills: ${worker.skills || 'N/A'}</div>
                    <p><strong>Experience:</strong> ${worker.experience || 'N/A'}</p>
                    ${worker.resumeBase64 ? `<a href="${worker.resumeBase64}" download="${worker.resumeFileName || 'resume'}" class="btn btn-primary" style="display:inline-block; margin-top:10px; font-size:12px; padding:5px 10px; text-decoration:none;">Download Resume</a>` : '<p style="font-size:12px; color:red; margin-top:8px;">No Resume Uploaded</p>'}
                </div>
            `;
        });
    })
    .catch(err => {
        workersBox.innerHTML = '<p>Failed to load workers list.</p>';
        console.error(err);
    });
}

// Load Applications for Client
function loadClientApplications() {
    const appBox = document.getElementById('applications-list');
    if (!appBox) return;

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getApplications', email: loggedInUserEmail })
    })
    .then(res => res.json())
    .then(apps => {
        appBox.innerHTML = '';
        if (!Array.isArray(apps) || apps.length === 0) {
            appBox.innerHTML = '<p>No applications received yet.</p>';
            return;
        }

        apps.forEach(app => {
            appBox.innerHTML += `
                <div class="job-card" style="border-left: 5px solid #007bff;">
                    <h4><i class="fa-solid fa-briefcase"></i> ${app.jobTitle}</h4>
                    <p><strong>Applicant:</strong> ${app.workerEmail}</p>
                    <p><strong>Company:</strong> ${app.company}</p>
                    <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">${app.status}</span></p>
                </div>
            `;
        });
    })
    .catch(err => {
        appBox.innerHTML = '<p>Failed to load applications.</p>';
        console.error(err);
    });
}

// Fetch Jobs and Match Skills (Worker)
function fetchJobsAndMatch(userSkills) {
    const suggestedBox = document.getElementById('suggested-jobs');
    const allJobsBox = document.getElementById('all-jobs');
    if (!suggestedBox || !allJobsBox) return;

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(jobs => {
            suggestedBox.innerHTML = '';
            allJobsBox.innerHTML = '';

            if (!Array.isArray(jobs) || jobs.length === 0) {
                suggestedBox.innerHTML = '<p>No jobs available.</p>';
                allJobsBox.innerHTML = '<p>No jobs available.</p>';
                return;
            }

            const userSkillList = userSkills.toLowerCase().split(',').map(s => s.trim()).filter(s => s !== "");

            jobs.forEach(job => {
                const requiredSkills = (job.requiredSkills || "").toLowerCase().split(',').map(s => s.trim());
                const isMatched = userSkillList.some(skill => requiredSkills.includes(skill));

                const cardHTML = `
                    <div class="job-card ${isMatched ? 'matched' : ''}">
                        <h4>${job.jobTitle}</h4>
                        <div class="company">${job.company}</div>
                        <div class="skills"><i class="fa-solid fa-code"></i> Skills: ${job.requiredSkills}</div>
                        <p>${job.description}</p>
                        <button class="btn btn-primary btn-block" style="margin-top:10px;" onclick="applyJob('${job.jobTitle}', '${job.company}', '${job.clientEmail}')">Apply Now</button>
                    </div>
                `;

                allJobsBox.innerHTML += cardHTML;
                if (isMatched) {
                    suggestedBox.innerHTML += cardHTML;
                }
            });

            if (suggestedBox.innerHTML === '') {
                suggestedBox.innerHTML = '<p>No skill-matched jobs found right now.</p>';
            }
        })
        .catch(err => {
            suggestedBox.innerHTML = '<p>Failed to load jobs.</p>';
            allJobsBox.innerHTML = '<p>Failed to load jobs.</p>';
            console.error(err);
        });
}

// Apply Job Function
async function applyJob(jobTitle, company, clientEmail) {
    if (!loggedInUserEmail) {
        alert("Please sign in to apply for jobs!");
        openModal('login');
        return;
    }

    const payload = {
        action: 'applyJob',
        jobTitle: jobTitle,
        company: company,
        workerEmail: loggedInUserEmail,
        clientEmail: clientEmail || ""
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert(`Successfully applied for "${jobTitle}" at ${company}!`);
        } else {
            alert("Failed to apply.");
        }
    } catch (err) {
        console.error(err);
        alert("Error applying for job.");
    }
}