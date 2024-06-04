const LOGIN_API = "https://resources-main-dtax.onrender.com//login";
const SIGNUP_API = "https://resources-main-dtax.onrender.com//CriarCliente";
const SIGNUPRESOURCES_API = "https://resources-main-dtax.onrender.com//CriarRecursos";
const DELETE_RESOURCE_API = "https://resources-main-dtax.onrender.com//DeleteRecursos";
const RESOURCES_API = "https://resources-main-dtax.onrender.com//recursos";
const WEBSOCKET_URL = "https://resources-main-dtax.onrender.com//ws";
const HISTORY_API = "https://resources-main-dtax.onrender.com//historico";
const RECUPERAR_SENHA_API = "https://resources-main-dtax.onrender.com//RecuperarSenha";
const VERIFY_OTP_API = "https://resources-main-dtax.onrender.com//VerifyOtp";
const RESET_PASSWORD_API = "https://resources-main-dtax.onrender.com//ResetPassword";

let jwtToken = null;
let userName = null;
let userId = null;
let websocket;
let heartbeatInterval;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const WEBSOCKET_RECONNECT_INTERVAL = 5000; // 5 seconds

document.addEventListener("DOMContentLoaded", function () {
  const storedToken = localStorage.getItem('jwtToken');
  const storedUserName = localStorage.getItem('userName');
  const storedUserId = localStorage.getItem('userId');

  if (storedToken && storedUserName && storedUserId) {
    jwtToken = storedToken;
    userName = storedUserName;
    userId = storedUserId;

    document.getElementById("user-name").textContent = `Bem-vindo, ${userName}!`;
    document.getElementById("login-signup-form").style.display = "none";
    document.getElementById("resource-list").style.display = "block";
    document.getElementById("main-header").style.display = "block";

    fetchResources();
    fetchHistory();
    connectWebSocket();
  } else {
    document.getElementById("login-signup-form").style.display = "block";
    document.getElementById("resource-list").style.display = "none";
    document.getElementById("main-header").style.display = "none";
  }

  // Navegação entre formulários
  document.getElementById("show-signup").onclick = function () {
    showForm("signup-form");
  };
  document.getElementById("show-login").onclick = function () {
    showForm("login-form");
  };
  document.getElementById("show-password-reset").onclick = function () {
    showForm("password-reset-form");
  };

  function showForm(formId) {
    document.querySelectorAll(".form-section").forEach(form => {
      form.classList.remove("active");
    });
    document.getElementById(formId).classList.add("active");
  }

  document.getElementById("login-form").onsubmit = handleLogin;
  document.getElementById("signup-form").onsubmit = handleSignup;
  document.getElementById("create-resource-form").onsubmit = createResource;
  document.getElementById("reserve-button").onclick = reserveResource;
  document.getElementById("nav-logout").onclick = handleLogout;

  // Event handlers for password reset
  document.getElementById("password-reset-form").onsubmit = handlePasswordReset;
  document.getElementById("verify-otp-form").onsubmit = handleVerifyOtp;
  document.getElementById("reset-password-form").onsubmit = handleResetPassword;


  function fetchResources() {
    fetch(RESOURCES_API, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then(response => response.json())
      .then(data => {
        console.log("Fetched resources:", data.recursos);
        populateResources(data.recursos);
      })
      .catch(error => {
        console.error("Error fetching resources:", error);
      });
  }

  function populateResources(recursos) {
    const resourcesTableBody = document.getElementById("resources-tbody");
    const reservedResourcesContainer = document.getElementById("reserved-resources-container");
    resourcesTableBody.innerHTML = "";
    reservedResourcesContainer.innerHTML = "";

    const availableResources = recursos.filter(resource => resource.disponivel);
    const reservedResources = recursos.filter(resource => !resource.disponivel && resource.reservaId === userId);

    availableResources.forEach((resource, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${resource.nome}</td>
        <td>
          <button class="btn btn-primary reserve-resource" data-id="${resource.id}"><i class="fas fa-plus"></i>Reservar</button>
          <button class="btn btn-secondary open-document" data-url="${resource.url}"><i class="fa fa-eye"></i></button>
        </td>
      `;
      resourcesTableBody.appendChild(row);
    });

    reservedResources.forEach(resource => {
      const card = document.createElement("div");
      card.className = "card col-md-4";
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${resource.nome}</h5>
          <button class="btn btn-primary open-document" data-url="${resource.url}"><i class="fa fa-eye"></i>Abrir</button>
          <button class="btn btn-danger return-resource" data-id="${resource.id}"><i class="fa fa-undo"></i>Devolver</button>
        </div>
      `;
      reservedResourcesContainer.appendChild(card);
    });

    document.querySelectorAll(".reserve-resource").forEach(button => {
      button.onclick = function () {
        const resourceId = this.getAttribute("data-id");
        reserveResource(resourceId);
      };
    });

    document.querySelectorAll(".open-document").forEach(button => {
      button.onclick = function () {
        const url = this.getAttribute("data-url");
        window.open(url, '_blank');
      };
    });

    document.querySelectorAll(".return-resource").forEach(button => {
      button.onclick = function () {
        const resourceId = this.getAttribute("data-id");
        returnResource(resourceId);
      };
    });
  }

  function reserveResource(resourceId) {
    fetch(`${RESOURCES_API}/${resourceId}/reservar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            console.error("Server response:", data);
            throw new Error(data.error || "Failed to reserve resource");
          });
        }
        return response.json();
      })
      .then(data => {
        alert("Resource reserved successfully!");
        fetchResources();
        websocket.send(JSON.stringify({ action: "update" }));
      })
      .catch(error => {
        console.error("Error reserving resource:", error);
        alert(error.message);
        location.reload();
      });
  }

  function returnResource(resourceId) {
    fetch(`${RESOURCES_API}/${resourceId}/devolver`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            console.error("Server response:", data);
            throw new Error(data.error || "Failed to return resource");
          });
        }
        return response.json();
      })
      .then(data => {
        alert("Resource returned successfully!");
        fetchResources();
        websocket.send(JSON.stringify({ action: "update" }));
      })
      .catch(error => {
        console.error("Error returning resource:", error);
        alert(error.message);
        location.reload();
      });
  }

  function handleLogout() {
    jwtToken = null;
    userName = null;
    userId = null;
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    document.getElementById("login-signup-form").style.display = "block";
    document.getElementById("resource-list").style.display = "none";
    document.getElementById("main-header").style.display = "none";
    if (websocket) {
      websocket.close();
    }
    clearInterval(heartbeatInterval);
  }

  function handlePasswordReset(event) {
    event.preventDefault();
    const email = document.getElementById("reset-email").value;
    fetch(RECUPERAR_SENHA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("Failed to send OTP: " + data.error);
          return;
        }
        alert("OTP sent to your email!");
        showForm("verify-otp-form");
      })
      .catch((error) => {
        console.error("Error during password reset:", error);
      });
  }

  function handleVerifyOtp(event) {
    event.preventDefault();
    const email = document.getElementById("verify-email").value;
    const otp = document.getElementById("otp").value;
    fetch(VERIFY_OTP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("OTP verification failed: " + data.error);
          return;
        }
        alert("OTP verified! You can now reset your password.");
        showForm("reset-password-form");
      })
      .catch((error) => {
        console.error("Error during OTP verification:", error);
      });
  }

  function handleResetPassword(event) {
    event.preventDefault();
    const email = document.getElementById("reset-email-final").value;
    const newPassword = document.getElementById("new-password").value;
    fetch(RESET_PASSWORD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: newPassword }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || "Failed to reset password");
          });
        }
        return response.json();
      })
      .then((data) => {
        alert("Password reset successfully! You can now log in with your new password.");
        showForm("login-form");
      })
      .catch((error) => {
        console.error("Error during password reset:", error);
        alert("Password reset failed: " + error.message);
      });
  }

  function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const loginData = { email: email, password };

    fetch(LOGIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert("Login failed: " + data.error);
          return;
        }
        jwtToken = data.token;
        userName = data.userName;
        userId = data.userId;
        console.log("Login successful! Token:", jwtToken);

        localStorage.setItem('jwtToken', jwtToken);
        localStorage.setItem('userName', userName);
        localStorage.setItem('userId', userId);

        document.getElementById("user-name").textContent = `Bem-vindo, ${userName}!`;
        document.getElementById("login-signup-form").style.display = "none";
        document.getElementById("resource-list").style.display = "block";
        document.getElementById("main-header").style.display = "block";
        fetchResources();
        fetchHistory();
        connectWebSocket();
      })
      .catch(error => {
        console.error("Error during login:", error);
      });
  }

  function handleSignup(event) {
    event.preventDefault();
    const username = document.getElementById("signup-username").value;
    const password = document.getElementById("signup-password").value;
    const email = document.getElementById("signup-email").value;

    const signupData = { nome: username, password, email };

    fetch(SIGNUP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signupData),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert("Signup failed: " + data.error);
          return;
        }
        alert("Registo feito com sucesso!");
        showForm("login-form");
      })
      .catch(error => {
        console.error("Error during signup:", error);
      });
  }

  function createResource(event) {
    event.preventDefault();
    const resourceName = document.getElementById("resource-name").value;
    const fileInput = document.getElementById("file-input").files[0];

    const formData = new FormData();
    formData.append("nome", resourceName);
    formData.append("file", fileInput);

    fetch(SIGNUPRESOURCES_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      body: formData,
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            const error = new Error(data.error || 'Failed to create resource');
            error.details = data;
            throw error;
          });
        }
        return response.json();
      })
      .then(data => {
        alert("Resource created successfully!");
        fetchResources();
        websocket.send(JSON.stringify({ action: "update" }));
        document.getElementById("create-resource-form").reset();
      })
      .catch(error => {
        console.error("Error creating resource:", error);
        alert(error.details ? error.details.error : "Failed to create resource");
      });
  }

  function fetchHistory() {
    fetch(HISTORY_API, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }
        populateHistory(data.historico);
      })
      .catch(error => {
        console.error("Error fetching history:", error);
      });
  }

  function populateHistory(history) {
    const historyTableBody = document.getElementById("history-entries");
    historyTableBody.innerHTML = "";

    history.forEach(entry => {
      const row = document.createElement("tr");

      const userCell = document.createElement("td");
      userCell.textContent = entry.cliente ? entry.cliente.nome : "N/A";
      row.appendChild(userCell);

      const resourceCell = document.createElement("td");
      resourceCell.textContent = entry.recurso ? entry.recurso.nome : "N/A";
      row.appendChild(resourceCell);

      const actionCell = document.createElement("td");
      actionCell.textContent = entry.operacao || "N/A";
      row.appendChild(actionCell);

      const dateCell = document.createElement("td");
      dateCell.textContent = entry.dataHora || "N/A";
      row.appendChild(dateCell);

      historyTableBody.appendChild(row);
    });
  }

  function connectWebSocket() {
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
      console.log("WebSocket connected!");
      sendHeartbeat();
      heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    };

    websocket.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      const message = JSON.parse(event.data);
      if (message.type === 'recursos') {
        populateResources(message.data);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed. Attempting to reconnect...");
      clearInterval(heartbeatInterval);
      setTimeout(connectWebSocket, WEBSOCKET_RECONNECT_INTERVAL);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  function sendHeartbeat() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ action: "heartbeat" }));
    }
  }
});
