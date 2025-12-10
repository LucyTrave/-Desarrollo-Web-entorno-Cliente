/* Davantedent — Gestión de citas
   Programación orientada a objetos, validación, LocalStorage
*/
// Utilidades
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
// Modelos
class Cita {
  constructor({ id, fechaISO, observaciones, paciente }) {
    this.id = id; // identificador oculto (no visible en tabla)
    this.fechaISO = fechaISO; // ISO-8601
    this.observaciones = observaciones ?? "";
    this.paciente = paciente; // { nombre, dni, telefono, nacimientoISO }
    this.createdAt = Date.now();
  }
  static crearDesdeFormulario(formData, id = Date.now().toString()) {
    return new Cita({
      id,
      fechaISO: formData.fecha,
      observaciones: formData.observaciones,
      paciente: {
        nombre: formData.nombre,
        dni: formData.dni,
        telefono: formData.telefono,
        nacimientoISO: formData.nacimiento
      }
    });
  }
}
class CitaStore {
  static KEY = "davantedent_citas";

  static todas() {
    const raw = localStorage.getItem(CitaStore.KEY);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  static guardarTodas(citas) {
    localStorage.setItem(CitaStore.KEY, JSON.stringify(citas));
  }
  static crear(cita) {
    const citas = CitaStore.todas();
    citas.push(cita);
    CitaStore.guardarTodas(citas);
    return cita.id;
  }
  static obtener(id) {
    const citas = CitaStore.todas();
    return citas.find(c => c.id === id) || null;
  }
  static actualizar(id, datosParciales) {
    const citas = CitaStore.todas();
    const idx = citas.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const actual = citas[idx];
    citas[idx] = { ...actual, ...datosParciales };
    CitaStore.guardarTodas(citas);
    return true;
  }
  static eliminar(id) {
    const citas = CitaStore.todas();
    const filtradas = citas.filter(c => c.id !== id);
    CitaStore.guardarTodas(filtradas);
    return filtradas.length !== citas.length;
  }
}
// UI y validación
class UI {
  static formEl = qs("#citaForm");
  static tablaBody = qs("#tablaCitasBody");
  static modeLabel = qs("#modeLabel");
  static btnCancelar = qs("#btnCancelar");
  static init() {
    // Mostrar modo desde querystring
    const params = new URLSearchParams(window.location.search);
    const modo = params.get("modo") || "crear";
    UI.modeLabel.textContent = modo === "gestionar" ? "Modo: gestionar" : "Modo: crear";
    // Cargar citas
    UI.renderTabla();
    // Eventos
    if (UI.formEl) {
      UI.formEl.addEventListener("submit", UI.onSubmit);
    }
    if (UI.btnCancelar) {
      UI.btnCancelar.addEventListener("click", UI.onCancelar);
    }
    // Si venimos en modo gestionar, no limpiamos el formulario automáticamente.
    if (modo === "crear") UI.limpiarFormulario();
  }
  static onSubmit(e) {
    e.preventDefault();
    const data = UI.leerFormulario();
    const errores = Validator.validar(data);
    UI.limpiarErrores();
    if (Object.keys(errores).length > 0) {
      UI.mostrarErrores(errores);
      return; // no crear/modificar
    }
    const idExistente = qs("#citaId").value?.trim();
    if (idExistente) {
      // Actualizar cita existente
      const ok = CitaStore.actualizar(idExistente, {
        fechaISO: data.fecha,
        observaciones: data.observaciones,
        paciente: {
          nombre: data.nombre,
          dni: data.dni,
          telefono: data.telefono,
          nacimientoISO: data.nacimiento
        }
      });
      if (ok) {
        UI.notificar("Cita actualizada correctamente.", "ok");
        UI.limpiarFormulario();
        UI.renderTabla();
      } else {
        UI.notificar("No se ha podido actualizar la cita.", "error");
      }
    } else {
      // Crear nueva cita con identificador único del instante de guardado
      const cita = Cita.crearDesdeFormulario(data);
      CitaStore.crear(cita);
      UI.notificar("Cita creada correctamente.", "ok");
      UI.limpiarFormulario();
      UI.renderTabla();
    }
  }
  static onCancelar() {
    UI.limpiarFormulario();
    UI.limpiarErrores();
    UI.notificar("Edición cancelada.", "muted");
  }
  static leerFormulario() {
    return {
      fecha: qs("#fecha").value,
      observaciones: qs("#observaciones").value,
      nombre: qs("#nombre").value,
      dni: qs("#dni").value,
      telefono: qs("#telefono").value,
      nacimiento: qs("#nacimiento").value
    };
  }
  static limpiarFormulario() {
    ["citaId","fecha","observaciones","nombre","dni","telefono","nacimiento"]
      .forEach(id => { const el = qs("#" + id); if (el) el.value = ""; });
  }
  static limpiarErrores() {
    qsa(".error").forEach(el => el.classList.remove("error"));
    qsa(".error-msg").forEach(el => el.textContent = "");
  }
  static mostrarErrores(errores) {
    Object.entries(errores).forEach(([campo, mensaje]) => {
      const input = qs("#" + campo);
      const msgEl = document.querySelector(`.error-msg[data-error-for="${campo}"]`);
      if (input) input.classList.add("error");
      if (msgEl) msgEl.textContent = mensaje;
    });
  }
  static renderTabla() {
    const citas = CitaStore.todas();
    UI.tablaBody.innerHTML = "";

    if (citas.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 8;
      td.textContent = "dato vacío";
      td.style.color = "#6b7280";
      td.style.textAlign = "center";
      tr.appendChild(td);
      UI.tablaBody.appendChild(tr);
      return;
    }
    citas.forEach((cita, idx) => {
      const tr = document.createElement("tr");
      UI.appendCell(tr, String(idx + 1)); // Orden (no id)
      const fechaStr = UI.formatearFecha(cita.fechaISO);  // Fecha legible
      UI.appendCell(tr, fechaStr);
      UI.appendCell(tr, cita.paciente?.nombre ?? "");  // Paciente
      UI.appendCell(tr, cita.paciente?.dni ?? "");// DNI
      UI.appendCell(tr, cita.paciente?.telefono ?? "");// Teléfono
      UI.appendCell(tr, UI.formatearFecha(cita.paciente?.nacimientoISO, true)); // Nacimiento
      UI.appendCell(tr, cita.observaciones ?? "");   // Observaciones

      // Acciones
      const tdAcc = document.createElement("td");
      tdAcc.className = "actions";

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn action--edit";
      btnEdit.type = "button";
      btnEdit.textContent = "Modificar";
      btnEdit.addEventListener("click", () => {
        // Cargar desde LocalStorage usando el ID oculto, no desde la vista
        const stored = CitaStore.obtener(cita.id);
        if (!stored) return;
        UI.cargarEnFormulario(stored);
        UI.notificar("Cargando cita en edición…", "muted");
      });
      const btnDel = document.createElement("button");
      btnDel.className = "btn action--delete";
      btnDel.type = "button";
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", () => {
        const ok = CitaStore.eliminar(cita.id);
        if (ok) {
          UI.notificar("Cita eliminada.", "ok");
          UI.renderTabla();
          // Si se ha eliminado la única cita, la fila “dato vacío” aparecerá automáticamente por renderTabla()
        } else {
          UI.notificar("No se ha podido eliminar la cita.", "error");
        }
      });
      tdAcc.appendChild(btnEdit);
      tdAcc.appendChild(btnDel);
      tr.appendChild(tdAcc);

      UI.tablaBody.appendChild(tr);
    });
  }
  static appendCell(tr, text) {
    const td = document.createElement("td");
    td.textContent = text ?? "";
    tr.appendChild(td);
  }
  static formatearFecha(iso, soloFecha = false) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const anio = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      return soloFecha ? `${dia}/${mes}/${anio}` : `${dia}/${mes}/${anio} ${hora}:${min}`;
    } catch { return iso; }
  }
  static cargarEnFormulario(cita) {
    // Rellenar campos desde LocalStorage por ID (no desde la vista)
    qs("#citaId").value = cita.id;
    qs("#fecha").value = cita.fechaISO ?? "";
    qs("#observaciones").value = cita.observaciones ?? "";
    qs("#nombre").value = cita.paciente?.nombre ?? "";
    qs("#dni").value = cita.paciente?.dni ?? "";
    qs("#telefono").value = cita.paciente?.telefono ?? "";
    qs("#nacimiento").value = cita.paciente?.nacimientoISO ?? "";
  }
  static notificar(texto, tipo = "muted") {
    // Pequeña notificación accesible y discreta
    const live = document.createElement("div");
    live.setAttribute("role", "status");
    live.className = "tag";
    live.style.position = "fixed";
    live.style.bottom = "20px";
    live.style.right = "20px";
    live.style.zIndex = "100";
    live.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
    if (tipo === "ok") {
      live.style.background = "#d7f3ee";
      live.style.color = "#0b4b43";
    } else if (tipo === "error") {
      live.style.background = "#fde2e4";
      live.style.color = "#7a1c24";
    } else {
      live.style.background = "#eef6ff";
      live.style.color = "#0b3566";
    }
    live.textContent = texto;
    document.body.appendChild(live);
    setTimeout(() => live.remove(), 1800);
  }
}
 // Validación de formulario
class Validator {
  static validar(data) {
    const errores = {};
    // Fecha: obligatoria y válida
    if (!data.fecha) {
      errores.fecha = "La fecha es obligatoria.";
    } else if (isNaN(new Date(data.fecha).getTime())) {
      errores.fecha = "La fecha no es válida.";
    }
    // Observaciones: opcional, pero limitarda la longitud
    if (data.observaciones && data.observaciones.length > 500) {
      errores.observaciones = "Demasiado largo (máx. 500 caracteres).";
    }
    // Nombre: no vacío y sin espacios
    if (!data.nombre || data.nombre.trim().length < 3) {
      errores.nombre = "Indique nombre y apellidos (mín. 3 caracteres).";
    }
    // DNI:  (8 dígitos + letra)
    const dniRegex = /^[0-9]{8}[A-Za-z]$/;
    if (!data.dni || !dniRegex.test(data.dni.trim())) {
      errores.dni = "DNI no válido. Formato esperado: 00000000A.";
    }
    // Teléfono: numérico. No puede ser cadena con letras
    const telSoloDigitos = /^[0-9]{9}$/; // validación simple: 9 dígitos
    if (!data.telefono || !telSoloDigitos.test(String(data.telefono).trim())) {
      errores.telefono = "Teléfono no válido. Debe contener 9 dígitos.";
    }
    // Nacimiento: fecha válida y no futura
    if (!data.nacimiento) {
      errores.nacimiento = "La fecha de nacimiento es obligatoria.";
    } else {
      const d = new Date(data.nacimiento);
      if (isNaN(d.getTime())) {
        errores.nacimiento = "Fecha de nacimiento no válida.";
      } else {
        const hoy = new Date();
        if (d > hoy) errores.nacimiento = "La fecha de nacimiento no puede ser futura.";
      }
    }
    return errores;
  }
}
// Inicialización en gestion.html únicamente
document.addEventListener("DOMContentLoaded", () => {
  // Sólo iniciar UI si estamos en la página de gestión
  if (qs("#tablaCitasBody") && qs("#citaForm")) {
    UI.init();
  }
});
