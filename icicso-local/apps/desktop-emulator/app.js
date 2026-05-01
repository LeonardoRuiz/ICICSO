(function () {
  const app = document.getElementById("app");
  if (!app) {
    return;
  }

  function normalizeGatewayBase(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function getDefaultGatewayBase() {
    const datasetValue = normalizeGatewayBase(app.dataset.gatewayBase);
    if (datasetValue) {
      return datasetValue;
    }

    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const queryValue = normalizeGatewayBase(params.get("gateway"));
      if (queryValue) {
        return queryValue;
      }

      if (/^https?:/.test(window.location.origin)) {
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        const host = window.location.hostname || "127.0.0.1";
        return `${protocol}//${host}:3100`;
      }
    }

    return "http://127.0.0.1:3100";
  }

  function resolveInitialGatewayBase() {
    const storedValue = normalizeGatewayBase(localStorage.getItem("icicso.gatewayBase"));
    if (!storedValue) {
      return getDefaultGatewayBase();
    }

    if (typeof window !== "undefined" && window.location && /^https?:/.test(window.location.origin)) {
      const legacySameOriginApi = normalizeGatewayBase(`${window.location.origin}/api`);
      if (storedValue === legacySameOriginApi) {
        return getDefaultGatewayBase();
      }
    }

    return storedValue;
  }

  const state = {
    gatewayBase: resolveInitialGatewayBase(),
    autoRefresh: localStorage.getItem("icicso.autoRefresh") !== "false",
    refreshIntervalMs: Number(localStorage.getItem("icicso.refreshMs") || "15000"),
    session: (() => {
      const raw = localStorage.getItem("icicso.session");
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
    actionState: "idle",
    actionMessage: "Sin acciones ejecutadas en esta sesión.",
    lastRefreshAt: null,
    timer: null,
    overview: null,
    block2Overview: null,
    evidenceLakeOverview: null,
    gpCpoOverview: null,
    runbookReadinessOverview: null,
    caseControlOverview: null,
    systemicControlOverview: null,
    gatewayHealth: null,
    errors: [],
    walkthroughState: "idle",
    walkthroughMessage: "Listo para ejecutar el recorrido demo.",
    walkthroughCurrentStep: null,
    walkthroughHistory: [],
  };

  const moduleDefinitions = [
    {
      key: "dataset",
      title: "Dataset certificación",
      hook: "/block2/dataset-status?caseId=CASE-CABG3-2026-00014",
      summary: "Conectará completitud, validez semántica y Readiness basal.",
    },
    {
      key: "evidence-lake",
      title: "Evidence Lake",
      hook: "/block3/evidence-lake/summary",
      summary: "Muestra Source Evidence Record (SER), Evidence Object (EO), Inter-Guideline Conflict / Divergence Record (ICDR) y snapshot científico del caso.",
    },
    {
      key: "ete",
      title: "Evidence Translation Engine (ETE)",
      hook: "/block3/ete/summary",
      summary: "Traducirá evidencia a trayectorias ejecutables por caso.",
    },
    {
      key: "eul",
      title: "Epistemic Uncertainty Layer (EUL)",
      hook: "/block3/eul/summary",
      summary: "Superficie de incertidumbre ejecutable para la ruta activa.",
    },
    {
      key: "gp-cpo",
      title: "Guideline Package / Clinical Pathway Object (GP / CPO)",
      hook: "/block5/gp-cpo/summary",
      summary: "Gobernanza de política y compilación operativa del caso.",
    },
    {
      key: "readiness",
      title: "Runbook Object / Readiness (RO)",
      hook: "/block6/readiness/summary",
      summary: "Visibilidad de preparación operativa por ruta y evidencia.",
    },
    {
      key: "state-machine",
      title: "State machine",
      hook: "/block7/case-control/summary",
      summary: "Estado estructural del caso y transiciones permitidas.",
    },
    {
      key: "srm-cqoi-drift",
      title: "Systemic Risk / Clinical Outcomes / Drift (SRM / CQOI)",
      hook: "/block8/systemic-control/summary",
      summary: "Control sistémico, calidad y deriva sobre cohortes y motores.",
    },
    {
      key: "downstream",
      title: "Downstream económico / comercial",
      hook: "/block9/downstream/summary",
      summary: "Salida económica, comercial y de adopción de rutas.",
    },
  ];

  const acronymDictionary = {
    "RDY-G": "RDY-G (Readiness Gate)",
    CQOI: "CQOI (Clinical Quality Outcome Intelligence)",
    ICDR: "ICDR (Inter-Guideline Conflict / Divergence Record)",
    DTQ: "DTQ (Data Trust & Quality)",
    SRM: "SRM (Systemic Risk Monitor)",
    STC: "STC (State Transition Capture)",
    ESL: "ESL (Evidence Snapshot Legal)",
    ETE: "ETE (Evidence Translation Engine)",
    EUL: "EUL (Epistemic Uncertainty Layer)",
    SER: "SER (Source Evidence Record)",
    EO: "EO (Evidence Object)",
    GP: "GP (Guideline Package)",
    CPO: "CPO (Clinical Pathway Object)",
    BOM: "BOM (Bill of Materials)",
    TAM: "TAM (Temporal Activation Model)",
    EVT: "EVT (Event Trigger)",
    ILC: "ILC (identidad longitudinal clínico-operativa)",
    RO: "RO (Runbook Object)",
    CABG: "CABG (coronary artery bypass grafting)",
  };

  const glossaryHighlights = [
    "ILC (identidad longitudinal clínico-operativa)",
    "SER (Source Evidence Record)",
    "EO (Evidence Object)",
    "ICDR (Inter-Guideline Conflict / Divergence Record)",
    "GP (Guideline Package)",
    "CPO (Clinical Pathway Object)",
    "RO (Runbook Object)",
    "BOM (Bill of Materials)",
    "TAM (Temporal Activation Model)",
    "EVT (Event Trigger)",
    "STC (State Transition Capture)",
    "ESL (Evidence Snapshot Legal)",
    "SRM (Systemic Risk Monitor)",
    "DTQ (Data Trust & Quality)",
    "CQOI (Clinical Quality Outcome Intelligence)",
  ];

  const demoUploadPresets = {
    renalLabs: {
      label: "Labs renales y perfusión",
      request: {
        documentType: "lab",
        sourceSystem: "LIS",
        ingestionMethod: "upload",
        rawFormat: "json",
        title: "Laboratorios de vigilancia renal postoperatoria",
        fileName: "cabg-renal-followup.json",
        payload: {
          observations: [
            { name: "Creatinina", value: 2.1, unit: "mg/dL", observedAt: "2026-03-30T08:15:00.000Z" },
            { name: "Troponina hs", value: 132, unit: "ng/L", observedAt: "2026-03-30T08:15:00.000Z" },
          ],
        },
      },
    },
    imagingUpdate: {
      label: "Imagen / FEVI de seguimiento",
      request: {
        documentType: "imaging",
        sourceSystem: "PACS",
        ingestionMethod: "upload",
        rawFormat: "json",
        title: "Ecocardiograma de seguimiento",
        fileName: "cabg-echo-followup.json",
        payload: {
          modality: "US",
          studyDescription: "Ecocardiograma de seguimiento",
          studyDate: "2026-03-30T09:30:00.000Z",
          measurements: {
            fevi: { value: 38, unit: "%" },
          },
        },
      },
    },
    medicationUpdate: {
      label: "Medicaciones activas",
      request: {
        documentType: "medication",
        sourceSystem: "EHR",
        ingestionMethod: "upload",
        rawFormat: "json",
        title: "Actualización de medicación activa",
        fileName: "cabg-medications-followup.json",
        payload: {
          medications: [
            { name: "Aspirina 100 mg VO diario" },
            { name: "Atorvastatina 80 mg VO nocturna" },
            { name: "Metoprolol 50 mg VO cada 12 h" },
            { name: "Insulina basal-bolo" },
            { name: "Furosemida 20 mg IV" },
          ],
        },
      },
    },
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function explainAcronyms(value) {
    let text = String(value ?? "");
    for (const [acronym, label] of Object.entries(acronymDictionary).sort((left, right) => right[0].length - left[0].length)) {
      const pattern = new RegExp(`(^|[^A-Z0-9-])(${acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^A-Z0-9-])`, "g");
      text = text.replace(pattern, (_, prefix) => `${prefix}${label}`);
    }
    return text;
  }

  function displayHtml(value) {
    return escapeHtml(explainAcronyms(value));
  }

  function statusClass(status) {
    if (status === "ok" || status === "active" || status === "connected") {
      return "ok";
    }
    if (status === "down" || status === "error") {
      return "bad";
    }
    return "warn";
  }

  function formatTime(value) {
    if (!value) {
      return "sin actualización";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("es-MX", {
      hour12: false,
    });
  }

  function setSession(session) {
    state.session = session;
    if (session) {
      localStorage.setItem("icicso.session", JSON.stringify(session));
    } else {
      localStorage.removeItem("icicso.session");
    }
  }

  function getDemoCaseId() {
    return state.overview && state.overview.demoCase && state.overview.demoCase.caseId
      ? state.overview.demoCase.caseId
      : "CASE-CABG3-2026-00014";
  }

  function getCaseControlState() {
    return state.caseControlOverview
      && state.caseControlOverview.caseControl
      && state.caseControlOverview.caseControl.caseControl
      && state.caseControlOverview.caseControl.caseControl.caseControl
      ? state.caseControlOverview.caseControl.caseControl.caseControl.currentState
      : null;
  }

  function getNextCaseState(currentState) {
    const map = {
      "PRE-OP": "INTRA-OP",
      "INTRA-OP": "ICU",
      ICU: "FLOOR",
      FLOOR: "FOLLOW-UP",
      "FOLLOW-UP": "CLOSED",
    };

    return currentState && map[currentState] ? map[currentState] : null;
  }

  function summarizeResult(result) {
    if (!result) {
      return "Sin payload de respuesta.";
    }

    if (typeof result === "string") {
      return result;
    }

    if (result.message) {
      return result.message;
    }

    if (result.document && result.document.documentId) {
      return `Documento ${result.document.documentId} ingerido. Dataset ${result.datasetStatus ? result.datasetStatus.certificationStatus : "actualizado"}.`;
    }

    if (result.guidelinePackage && result.guidelinePackage.gpId) {
      return `GP (Guideline Package) ${result.guidelinePackage.gpId} disponible.`;
    }

    if (result.cpo && result.cpo.cpoId) {
      return `CPO (Clinical Pathway Object) ${result.cpo.cpoId} generado.`;
    }

    if (result.readinessSnapshot && result.readinessSnapshot.snapshotId) {
      return `Readiness ${result.readinessSnapshot.overallStatus} con snapshot ${result.readinessSnapshot.snapshotId}.`;
    }

    if (result.caseControl && result.caseControl.currentState) {
      return `Case control en ${result.caseControl.currentState}.`;
    }

    try {
      return JSON.stringify(result).slice(0, 260);
    } catch {
      return "Acción ejecutada.";
    }
  }

  function getWalkthroughSteps() {
    const block2 = state.block2Overview && state.block2Overview.datasetStatus
      ? state.block2Overview
      : null;
    const gpCpo = state.gpCpoOverview && state.gpCpoOverview.guidelineHub && state.gpCpoOverview.kbol
      ? state.gpCpoOverview
      : null;
    const readiness = state.runbookReadinessOverview && state.runbookReadinessOverview.readiness && state.runbookReadinessOverview.readiness.readinessSnapshot
      ? state.runbookReadinessOverview.readiness.readinessSnapshot
      : null;
    const caseControl = state.caseControlOverview && state.caseControlOverview.caseControl && state.caseControlOverview.caseControl.caseControl
      ? state.caseControlOverview.caseControl.caseControl
      : null;
    const timeline = state.overview && Array.isArray(state.overview.auditTimeline) ? state.overview.auditTimeline : [];
    const hasLogin = !!(state.session && state.session.token);
    const hasUpload = timeline.some((event) => event.eventType === "document.ingested");
    const hasCompile = !!(gpCpo && gpCpo.kbol && gpCpo.kbol.cpo);
    const hasReadiness = !!readiness;
    const isActivated = !!(caseControl && caseControl.activated);
    const hasAdvanced = !!(caseControl && caseControl.transitions && caseControl.transitions.length > 1);

    return [
      {
        key: "login",
        label: "Login",
        detail: hasLogin ? "Sesión activa en auth-service." : "Autenticación local para auditar la secuencia.",
        status: hasLogin ? "ok" : "warn",
      },
      {
        key: "upload",
        label: "Upload",
        detail: block2
          ? `${block2.documents.length} documentos y ${block2.parsedVariables.length} variables en el dataset.`
          : "Upload estructurado hacia ingestión, provenance y mapping.",
        status: hasUpload ? "ok" : "warn",
      },
      {
        key: "compile",
        label: "GP / CPO",
        detail: hasCompile
          ? `${gpCpo.kbol.cpo.cpoId} emitido para el caso demo.`
          : "Compilación de Guideline Package, CPO y runbook.",
        status: hasCompile ? "ok" : "warn",
      },
      {
        key: "readiness",
        label: "Readiness",
        detail: hasReadiness
          ? `Snapshot ${readiness.overallStatus} disponible.`
          : "Evaluación de readiness y gates operativos.",
        status: hasReadiness ? (readiness.overallStatus === "PASS" ? "ok" : "bad") : "warn",
      },
      {
        key: "activate",
        label: "Activate",
        detail: isActivated
          ? `${caseControl.currentState} como estado activo del caso.`
          : "Activación formal en la state machine.",
        status: isActivated ? "ok" : "warn",
      },
      {
        key: "advance",
        label: "Advance",
        detail: hasAdvanced
          ? `${caseControl.transitions.length} transiciones registradas en la secuencia.`
          : "Transición controlada al siguiente estado clínico.",
        status: hasAdvanced ? "ok" : "warn",
      },
    ];
  }

  function pushWalkthroughHistory(message, status = "warn") {
    state.walkthroughHistory = [
      {
        createdAt: new Date().toISOString(),
        message,
        status,
      },
      ...state.walkthroughHistory,
    ].slice(0, 8);
  }

  function parseWalkthroughStepIndex(label) {
    const match = /^(\d+)\/\d+/.exec(String(label || "").trim());
    return match ? Number(match[1]) - 1 : -1;
  }

  async function executeWalkthroughStep(label, action) {
    state.walkthroughState = "working";
    state.walkthroughMessage = label;
    state.walkthroughCurrentStep = label;
    render();

    const result = await action();
    await refresh();
    pushWalkthroughHistory(`${label}: ${summarizeResult(result)}`, "ok");
    state.walkthroughMessage = `${label}: ${summarizeResult(result)}`;
    render();
    return result;
  }

  async function runWalkthrough() {
    const currentCaseId = getDemoCaseId();
    const nextState = getNextCaseState(getCaseControlState());

    try {
      await executeWalkthroughStep("1/6 Login demo", async () => {
        if (state.session && state.session.token) {
          return "Sesión reutilizada.";
        }

        const session = await requestJson("/auth/login", {
          method: "POST",
          body: {
            email: "admin@icicso.local",
            password: "Admin123!",
          },
        });
        setSession(session);
        return session;
      });

      await executeWalkthroughStep("2/6 Upload estructurado", async () =>
        requestJson("/ingestion/ingestions/structured", {
          method: "POST",
          body: {
            caseId: currentCaseId,
            ...demoUploadPresets.renalLabs.request,
          },
        }));

      await executeWalkthroughStep("3/6 Compilación GP/CPO", async () => {
        const encodedCaseId = encodeURIComponent(currentCaseId);
        const guidelinePackage = await requestJson(`/ghl/packages/publish?caseId=${encodedCaseId}`, { method: "POST" });
        const cpo = await requestJson(`/kbol/cpo/generate?caseId=${encodedCaseId}`, { method: "POST" });
        const runbook = await requestJson(`/runbook/runbook/generate?caseId=${encodedCaseId}`, { method: "POST" });
        return { guidelinePackage, cpo, runbook };
      });

      await executeWalkthroughStep("4/6 Readiness", async () => {
        const encodedCaseId = encodeURIComponent(currentCaseId);
        return requestJson(`/readiness/readiness/evaluate?caseId=${encodedCaseId}`, { method: "POST" });
      });

      await executeWalkthroughStep("5/6 Activación del caso", async () => {
        const encodedCaseId = encodeURIComponent(currentCaseId);
        return requestJson(`/case-control/activate?caseId=${encodedCaseId}&actorRole=case-controller`, { method: "POST" });
      });

      if (nextState) {
        await executeWalkthroughStep(`6/6 Transición a ${nextState}`, async () => {
          const encodedCaseId = encodeURIComponent(currentCaseId);
          return requestJson(`/case-control/transition?caseId=${encodedCaseId}`, {
            method: "POST",
            body: {
              toState: nextState,
              reason: `Walkthrough demo hacia ${nextState}.`,
              actorRole: "case-controller",
            },
          });
        });
      } else {
        pushWalkthroughHistory("6/6 Transición omitida: no existe siguiente estado disponible.", "warn");
      }

      state.walkthroughState = "ok";
      state.walkthroughCurrentStep = null;
      state.walkthroughMessage = "Walkthrough demo completado.";
      render();
    } catch (error) {
      state.walkthroughState = "failed";
      state.walkthroughCurrentStep = null;
      state.walkthroughMessage = error instanceof Error ? error.message : "Walkthrough fallido.";
      pushWalkthroughHistory(`Walkthrough fallido: ${state.walkthroughMessage}`, "bad");
      render();
    }
  }

  function deriveModuleStatus(definition) {
    const demoCase = state.overview && state.overview.demoCase ? state.overview.demoCase : null;
    const services = state.overview && Array.isArray(state.overview.services) ? state.overview.services : [];
    const timeline = state.overview && Array.isArray(state.overview.auditTimeline) ? state.overview.auditTimeline : [];
    const evidenceLake = state.evidenceLakeOverview && state.evidenceLakeOverview.evidenceLake
      ? state.evidenceLakeOverview.evidenceLake
      : null;
    const block2 = state.block2Overview && state.block2Overview.datasetStatus
      ? state.block2Overview
      : null;
    const gpCpo = state.gpCpoOverview && state.gpCpoOverview.guidelineHub && state.gpCpoOverview.kbol
      ? state.gpCpoOverview
      : null;
    const readiness = state.runbookReadinessOverview && state.runbookReadinessOverview.runbook && state.runbookReadinessOverview.readiness
      ? state.runbookReadinessOverview
      : null;
    const caseControl = state.caseControlOverview && state.caseControlOverview.caseControl
      ? state.caseControlOverview.caseControl
      : null;
    const systemicControl = state.systemicControlOverview && state.systemicControlOverview.systemicRisk && state.systemicControlOverview.cqoi
      ? state.systemicControlOverview
      : null;

    if (definition.key === "evidence-lake" && evidenceLake) {
      return {
        status: "active",
        headline: `${evidenceLake.activeSer.length} SER / ${evidenceLake.activeEo.length} EO`,
        detail: `${evidenceLake.openIcdr.length} ICDR abiertos y snapshot científico activo para el caso demo.`,
      };
    }

    if (definition.key === "gp-cpo" && gpCpo && gpCpo.guidelineHub && gpCpo.kbol && gpCpo.kbol.cpo) {
      return {
        status: "active",
        headline: gpCpo.kbol.cpo.status,
        detail: `${gpCpo.guidelineHub.guidelinePackage.gpId} y ${gpCpo.kbol.frameworks.length} frameworks activos para el caso demo.`,
      };
    }

    if (definition.key === "readiness" && readiness && readiness.readiness && readiness.readiness.readinessSnapshot) {
      return {
        status: readiness.readiness.readinessSnapshot.overallStatus === "PASS" ? "active" : "bad",
        headline: readiness.readiness.readinessSnapshot.overallStatus,
        detail: `${readiness.runbook.actorMatrix.length} actores, ${readiness.readiness.readinessGates.length} gates y ${readiness.readiness.blockingReasons.length} bloqueos.`,
      };
    }

    if (definition.key === "state-machine" && caseControl && caseControl.caseControl && caseControl.caseControl.caseControl) {
      return {
        status: "active",
        headline: caseControl.caseControl.caseControl.currentState,
        detail: `${caseControl.caseControl.transitions.length} transiciones, ${caseControl.caseControl.legalSnapshots.length} ESL y ${caseControl.caseControl.overrides.length} overrides.`,
      };
    }

    if (definition.key === "srm-cqoi-drift" && systemicControl && systemicControl.systemicRisk && systemicControl.cqoi) {
      return {
        status: "active",
        headline: `${systemicControl.systemicRisk.signals.length} señales`,
        detail: `${systemicControl.cqoi.metrics.length} métricas CQOI, ${systemicControl.cqoi.driftRecords.length} drift records y DTQ ${systemicControl.systemicRisk.dtq.traceabilityScore.overallScore}.`,
      };
    }

    if (definition.key === "state-machine" && demoCase) {
      return {
        status: "active",
        headline: demoCase.status,
        detail: "El caso demo ya tiene estado operativo visible desde identity-service.",
      };
    }

    if (definition.key === "dataset" && block2 && block2.datasetStatus) {
      return {
        status: block2.datasetStatus.certificationStatus === "PASS" ? "active" : block2.datasetStatus.certificationStatus === "PARTIAL" ? "warn" : "bad",
        headline: block2.datasetStatus.certificationStatus,
        detail: `${block2.documents.length} documentos, ${block2.parsedVariables.length} variables y ${block2.datasetStatus.missingVariables.length} faltantes.`,
      };
    }

    if (definition.key === "dataset" && demoCase) {
      return {
        status: "warn",
        headline: "Conectando",
        detail: "El caso demo ya está vivo; el dataset aparecerá al responder /block2/overview.",
      };
    }

    if ((definition.key === "ete" || definition.key === "eul") && services.length > 0) {
      return {
        status: "warn",
        headline: "Preparado para conectar",
        detail: "El tablero ya resuelve gateway y caso demo; falta publicar este módulo en el monorepo.",
      };
    }

    if (definition.key === "gp-cpo" && timeline.length > 0) {
      return {
        status: "warn",
        headline: "Esperando compilación",
        detail: "La línea de auditoría ya existe; Guideline Package / Clinical Pathway Object (GP / CPO) puede engancharse al mismo caso demo.",
      };
    }

    return {
      status: "warn",
      headline: "Standby",
      detail: definition.summary,
    };
  }

  function render() {
    const services = state.overview && Array.isArray(state.overview.services) ? state.overview.services : [];
    const timeline = state.overview && Array.isArray(state.overview.auditTimeline) ? state.overview.auditTimeline : [];
    const demoCase = state.overview && state.overview.demoCase ? state.overview.demoCase : null;
    const currentCaseId = getDemoCaseId();
    const currentCaseState = getCaseControlState();
    const nextCaseState = getNextCaseState(currentCaseState);
    const block2 = state.block2Overview && state.block2Overview.datasetStatus
      ? state.block2Overview
      : null;
    const evidenceLake = state.evidenceLakeOverview && state.evidenceLakeOverview.evidenceLake
      ? state.evidenceLakeOverview.evidenceLake
      : null;
    const gpCpo = state.gpCpoOverview && state.gpCpoOverview.guidelineHub && state.gpCpoOverview.kbol
      ? state.gpCpoOverview
      : null;
    const readiness = state.runbookReadinessOverview && state.runbookReadinessOverview.runbook && state.runbookReadinessOverview.readiness
      ? state.runbookReadinessOverview
      : null;
    const caseControl = state.caseControlOverview && state.caseControlOverview.caseControl
      ? state.caseControlOverview.caseControl
      : null;
    const systemicControl = state.systemicControlOverview && state.systemicControlOverview.systemicRisk && state.systemicControlOverview.cqoi
      ? state.systemicControlOverview
      : null;
    const onlineServices = services.filter((service) => service.status === "ok").length;
    const moduleSnapshots = moduleDefinitions.map((definition) => ({
      definition,
      moduleState: deriveModuleStatus(definition),
    }));
    const attentionModules = moduleSnapshots.filter(
      ({ moduleState }) => moduleState.status === "warn" || moduleState.status === "bad",
    ).length;
    const gatewayStatus = state.gatewayHealth && state.gatewayHealth.status ? state.gatewayHealth.status : "warn";
    const gatewayLabel = state.gatewayHealth && state.gatewayHealth.status ? state.gatewayHealth.status : "sin gateway";
    const sessionLabel = state.session && state.session.user ? state.session.user.email : "sin login";
    const caseHeadline = demoCase ? demoCase.caseId : "caso no visible";
    const caseSummary = demoCase
      ? demoCase.reason || demoCase.clinicalSummary || "Caso demo activo sin resumen clínico cargado."
      : `Esperando ${state.gatewayBase}/block1/overview`;
    const actionTone = state.actionState === "failed" ? "bad" : state.actionState === "working" ? "warn" : "ok";
    const walkthroughTone = state.walkthroughState === "failed" ? "bad" : state.walkthroughState === "working" ? "warn" : state.walkthroughState === "ok" ? "ok" : "warn";
    const walkthroughSteps = getWalkthroughSteps();
    const completedWalkthroughSteps = walkthroughSteps.filter((step) => step.status === "ok").length;
    const productStageLabel = currentCaseState
      || (readiness && readiness.readiness && readiness.readiness.readinessSnapshot
        ? readiness.readiness.readinessSnapshot.overallStatus
        : block2 && block2.datasetStatus
          ? block2.datasetStatus.certificationStatus
          : "BOOT");
    const productStageDetail = currentCaseState
      ? `Caso activo en ${currentCaseState} con ${timeline.length} eventos trazados.`
      : block2 && block2.datasetStatus
        ? `Dataset ${block2.datasetStatus.certificationStatus} listo para profundizar el caso.`
        : "Runtime listo para cargar caso, compilar ruta y activar state machine.";
    const activeWalkthroughIndex = state.walkthroughState === "working"
      ? parseWalkthroughStepIndex(state.walkthroughCurrentStep || state.walkthroughMessage)
      : -1;
    const visualWalkthroughProgress = state.walkthroughState === "working" && activeWalkthroughIndex >= 0 && activeWalkthroughIndex >= completedWalkthroughSteps
      ? completedWalkthroughSteps + 0.5
      : completedWalkthroughSteps;
    const walkthroughProgressPercent = Math.max(0, Math.min(100, (visualWalkthroughProgress / walkthroughSteps.length) * 100));
    const recommendedActionKey = walkthroughSteps.find((step) => step.status !== "ok")?.key || "done";
    const recommendedActionLabel = {
      login: "Iniciar sesión",
      upload: "Simular upload estructurado",
      compile: "Compilar GP / CPO",
      readiness: "Reevaluar readiness",
      activate: "Activar caso",
      advance: nextCaseState ? `Avanzar a ${nextCaseState}` : "Sin siguiente transición",
      done: "Walkthrough completo",
    }[recommendedActionKey];
    const actionGuide = {
      login: "Empieza por autenticar al usuario demo para habilitar trazabilidad y acciones con contexto.",
      upload: "El siguiente movimiento visible es ingerir un preset para poblar dataset, provenance y timeline.",
      compile: "Ahora toca compilar Guideline Package, Clinical Pathway Object y runbook para que aparezca la ruta.",
      readiness: "Después de compilar, reevalúa readiness para materializar gates y snapshot operativo.",
      activate: "Con readiness disponible, activa el caso en la state machine para moverlo al flujo formal.",
      advance: nextCaseState ? `El siguiente paso visible es transicionar el caso a ${nextCaseState}.` : "No hay siguiente transición disponible con el estado actual.",
      done: "La secuencia principal ya quedó completada. Puedes repetir pasos o usar el walkthrough completo.",
    }[recommendedActionKey];

    app.innerHTML = `
      <div class="shell">
        <nav class="product-nav">
          <div class="product-brand">
            <span class="product-brand-mark"></span>
            <div>
              <strong>ICICSO</strong>
              <span>Clinical Continuum Workspace</span>
            </div>
          </div>
          <div class="product-links">
            <a href="#continuum-overview">Continuum</a>
            <a href="#case-workspace">Case</a>
            <a href="#knowledge-workspace">Knowledge</a>
            <a href="#pathway-workspace">Pathway</a>
            <a href="#readiness-workspace">Readiness</a>
            <a href="#state-machine-workspace">State</a>
            <a href="#systemic-workspace">Systemic</a>
            <a href="#walkthrough-rail">Operator</a>
          </div>
        </nav>

        <section class="topbar">
          <article class="hero">
            <div class="hero-intro">
              <div class="hero-heading">
                <p class="eyebrow">ICICSO Local Runtime</p>
                <div class="hero-badges">
                  <span class="badge ${statusClass(gatewayStatus)}">${escapeHtml(gatewayLabel)}</span>
                  <span class="badge ${statusClass(demoCase ? "active" : "warn")}">${demoCase ? "caso visible" : "caso pendiente"}</span>
                  <span class="badge ${statusClass(attentionModules > 0 ? "warn" : "ok")}">${escapeHtml(attentionModules)} módulos con atención</span>
                </div>
                <h1>Clinical pathway orchestration for CABG in motion.</h1>
              </div>
              <div class="hero-copy">
                Workspace operativo para convertir evidencia, pathway, readiness y state transitions en una sola superficie. El objetivo ya no es mostrar módulos sueltos, sino hacer visible cómo se sentiría el SaaS terminado sobre el caso demo.
              </div>
              <div class="hero-actions">
                <a class="hero-link hero-link-primary" href="#walkthrough-workspace">Ejecutar recorrido</a>
                <a class="hero-link" href="#case-workspace">Abrir case workspace</a>
                <a class="hero-link" href="#knowledge-workspace">Abrir knowledge</a>
                <a class="hero-link" href="#pathway-workspace">Abrir pathway</a>
                <a class="hero-link" href="#continuum-overview">Ver continuum</a>
              </div>
            </div>
            <div class="hero-strip">
              <div class="strip-item">
                <div class="service-meta">Superficie viva</div>
                <strong>${escapeHtml(onlineServices)} / ${escapeHtml(services.length || 4)}</strong>
                <span>servicios respondiendo</span>
              </div>
              <div class="strip-item">
                <div class="service-meta">Traza del caso</div>
                <strong>${escapeHtml(timeline.length)}</strong>
                <span>eventos de dominio</span>
              </div>
              <div class="strip-item">
                <div class="service-meta">Ritmo de lectura</div>
                <strong>${escapeHtml(formatTime(state.lastRefreshAt))}</strong>
                <span>último refresh</span>
              </div>
            </div>
            <section class="hero-rail">
              <article class="hero-focus">
                <div class="service-meta">Operating stage</div>
                <strong>${escapeHtml(productStageLabel)}</strong>
                <p>${escapeHtml(productStageDetail)}</p>
              </article>
              <article class="hero-focus">
                <div class="service-meta">Narrative flow</div>
                <strong>Ingest → Compile → Readiness → Activate</strong>
                <p>La vista superior ordena el recorrido clínico para que el sistema se lea como producto, no como colección de endpoints.</p>
              </article>
            </section>
            <article class="hero-case">
              <div class="hero-case-head">
                <div>
                  <div class="service-meta">Caso foco</div>
                  <strong>${escapeHtml(caseHeadline)}</strong>
                </div>
                <span class="badge ${statusClass(currentCaseState ? "active" : "warn")}">${escapeHtml(currentCaseState || "sin state machine")}</span>
              </div>
              <p>${escapeHtml(caseSummary)}</p>
            </article>
          </article>

          <aside class="control-panel">
            <div class="control-panel-head">
              <p class="eyebrow">Control Surface</p>
              <h2>Gateway, sesión y ritmo de refresh.</h2>
            </div>
            <div class="control-row">
              <label for="gatewayBase">Gateway base URL</label>
              <input id="gatewayBase" value="${escapeHtml(state.gatewayBase)}" />
            </div>
            <div class="control-actions">
              <button class="primary" id="refreshNow">Refresh ahora</button>
              <button class="secondary ${state.autoRefresh ? "active" : ""}" id="toggleAutoRefresh">${state.autoRefresh ? "Auto-refresh activo" : "Auto-refresh inactivo"}</button>
            </div>
            <div class="status-box">
              <div class="service-meta">Sesión demo</div>
              <strong>${escapeHtml(sessionLabel)}</strong>
              <p>${escapeHtml(state.session && state.session.user ? `rol ${state.session.user.role || "local"}` : "Login opcional para dejar huella de auditoría en /auth/login.")}</p>
            </div>
            <div class="status-box">
              <div class="service-meta">Última acción</div>
              <strong>${escapeHtml(state.actionState)}</strong>
              <p>${escapeHtml(state.actionMessage)}</p>
            </div>
            <div class="status-box">
              <div class="service-meta">Accesos de auditoría</div>
              <div class="control-shortcuts audit-shortcuts">
                <a class="shortcut-link" href="${escapeHtml(state.gatewayBase)}/health" target="_blank" rel="noopener noreferrer">Gateway health</a>
                <a class="shortcut-link" href="${escapeHtml(state.gatewayBase)}/block1/overview" target="_blank" rel="noopener noreferrer">Block1 overview</a>
                <a class="shortcut-link" href="${escapeHtml(state.gatewayBase)}/audit/events" target="_blank" rel="noopener noreferrer">Audit events</a>
                <a class="shortcut-link" href="./audit-links.html" target="_blank" rel="noopener noreferrer">Abrir hub de auditoría</a>
                <a class="shortcut-link" href="./repo-html-hub.html" target="_blank" rel="noopener noreferrer">Abrir hub HTML del repo</a>
              </div>
            </div>
            <div class="status-line">
              <span>Intervalo base: ${escapeHtml(Math.round(state.refreshIntervalMs / 1000))}s</span>
              <span>${escapeHtml(state.errors[0] || "Escuchando endpoints locales.")}</span>
            </div>
            <div class="control-shortcuts">
              <a class="shortcut-link" href="#walkthrough-workspace">Mover caso</a>
              <a class="shortcut-link" href="#timeline-workspace">Ver timeline</a>
              <a class="shortcut-link" href="#case-workspace">Explorar caso</a>
            </div>
          </aside>
        </section>

        <section class="signal-band">
          <article class="signal-item">
            <div class="service-meta">Gateway</div>
            <strong>${escapeHtml(gatewayLabel)}</strong>
            <p>${escapeHtml(state.gatewayBase)}</p>
          </article>
          <article class="signal-item">
            <div class="service-meta">Caso actual</div>
            <strong>${escapeHtml(caseHeadline)}</strong>
            <p>${escapeHtml(demoCase ? (demoCase.clinicalSummary || "Caso demo conectado al overview.") : "Todavía sin respuesta base.")}</p>
          </article>
          <article class="signal-item">
            <div class="service-meta">State machine</div>
            <strong>${escapeHtml(currentCaseState || "pendiente")}</strong>
            <p>${escapeHtml(nextCaseState ? `siguiente transición sugerida: ${nextCaseState}` : "sin transición disponible todavía")}</p>
          </article>
          <article class="signal-item">
            <div class="service-meta">Acción operativa</div>
            <strong>${escapeHtml(state.actionState)}</strong>
            <p>${escapeHtml(state.actionMessage || "Sin operación reciente.")}</p>
          </article>
        </section>

        <section id="continuum-overview" class="panel continuum-panel">
          <div class="panel-header">
            <div>
              <h2>Continuum visible</h2>
              <p>Lectura compacta de bloques y hooks para saber qué está activo, degradado o todavía prometido.</p>
            </div>
            <span class="badge ${statusClass(attentionModules > 0 ? "warn" : "ok")}">${escapeHtml(moduleSnapshots.length)} módulos</span>
          </div>
          <div class="continuum-ribbon">
            ${moduleSnapshots
              .map(
                ({ definition, moduleState }) => `
                  <article class="continuum-node continuum-node-${statusClass(moduleState.status)}">
                    <div class="continuum-node-top">
                      <span class="continuum-node-title">${displayHtml(definition.title)}</span>
                      <span class="badge ${statusClass(moduleState.status)}">${escapeHtml(moduleState.status)}</span>
                    </div>
                    <strong>${displayHtml(moduleState.headline)}</strong>
                    <p>${displayHtml(moduleState.detail)}</p>
                    <div class="hook-path">${escapeHtml(definition.hook)}</div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="layout">
          <div class="column">
            <section id="pathway-workspace" class="panel premium-panel pathway-panel">
              <div class="panel-header">
                <div>
                  <h2>Servicios activos</h2>
                  <p>Lectura de salud del gateway y de los servicios base ya publicados.</p>
                </div>
                <span class="badge ${statusClass(state.gatewayHealth && state.gatewayHealth.status ? state.gatewayHealth.status : "warn")}">${escapeHtml(state.gatewayHealth && state.gatewayHealth.status ? state.gatewayHealth.status : "sin gateway")}</span>
              </div>
              <div class="service-wall">
                ${services.length > 0
                  ? services
                      .map(
                        (service) => `
                          <article class="service-item">
                            <div class="service-meta">${escapeHtml(service.service)}</div>
                            <strong>${escapeHtml(service.status)}</strong>
                            <div class="service-meta">puerto ${escapeHtml(service.port)}</div>
                            <div class="service-meta">${escapeHtml(formatTime(service.timestamp))}</div>
                          </article>
                        `,
                      )
                      .join("")
                  : `<div class="empty-state">Sin respuesta de servicios. Si el gateway no está arriba, este tablero seguirá abierto pero en modo degradado.</div>`}
              </div>
            </section>

            <section id="case-workspace" class="panel premium-panel">
              <div class="panel-header">
                <div>
                  <h2>Caso demo CABG (coronary artery bypass grafting) x3</h2>
                  <p>Identidad longitudinal, episodio clínico y caso visibles desde el monorepo.</p>
                </div>
                <span class="badge ${statusClass(demoCase ? "active" : "warn")}">${demoCase ? "visible" : "no disponible"}</span>
              </div>
              ${
                demoCase
                  ? `
                    <div class="case-stack">
                      <section class="workspace-hero">
                        <article class="workspace-hero-main">
                          <div class="service-meta">Resumen operativo</div>
                          <strong>${escapeHtml(demoCase.caseId)}</strong>
                          <p>${escapeHtml(demoCase.reason || "Sin razón clínica registrada.")}</p>
                          <div class="workspace-tags">
                            <span class="workspace-tag">${escapeHtml(demoCase.status || "sin status")}</span>
                            <span class="workspace-tag">${escapeHtml(currentCaseState || "sin state machine")}</span>
                            <span class="workspace-tag">${escapeHtml(sessionLabel)}</span>
                          </div>
                        </article>
                        <article class="workspace-hero-side">
                          <div class="service-meta">Clinical summary</div>
                          <strong>${escapeHtml(demoCase.clinicalSummary || "Pendiente")}</strong>
                          <p>El caso se presenta como workspace longitudinal, listo para evidence, readiness y transición clínica.</p>
                        </article>
                      </section>
                      <div class="case-grid">
                        <article class="case-card">
                          <div class="service-meta">ILC (identidad longitudinal clínico-operativa)</div>
                          <strong>${escapeHtml(demoCase.ilcId)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Episode</div>
                          <strong>${escapeHtml(demoCase.episodeId)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Estado</div>
                          <strong>${escapeHtml(demoCase.status)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Resumen clínico</div>
                          <strong>${escapeHtml(demoCase.clinicalSummary || "Pendiente")}</strong>
                        </article>
                      </div>
                    </div>
                  `
                  : `<div class="empty-state">El caso demo aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block1/overview responda.</div>`
              }
            </section>

            <section id="walkthrough-workspace" class="panel premium-panel">
              <div class="panel-header">
                <div>
                  <h2>Bloque 2 ingestión y gobernanza</h2>
                  <p>Upload, parsing, mapping terminológico y certificación del dataset CABG x3.</p>
                </div>
                <span class="badge ${statusClass(block2 && block2.datasetStatus ? (block2.datasetStatus.certificationStatus === "PASS" ? "active" : block2.datasetStatus.certificationStatus === "PARTIAL" ? "warn" : "bad") : "warn")}">${escapeHtml(block2 && block2.datasetStatus ? block2.datasetStatus.certificationStatus : "pendiente")}</span>
              </div>
              ${
                block2
                  ? `
                    <div class="case-grid">
                      <article class="case-card">
                        <div class="service-meta">Documentos</div>
                        <strong>${escapeHtml(block2.documents.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Variables parseadas</div>
                        <strong>${escapeHtml(block2.parsedVariables.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Mappings</div>
                        <strong>${escapeHtml(block2.terminologyMappings.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Readiness</div>
                        <strong>${escapeHtml(block2.datasetStatus.readinessForEte ? "listo" : "bloqueado")}</strong>
                      </article>
                    </div>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">Documentos ingeridos</div>
                        <strong>${escapeHtml(block2.documents.map((item) => item.title || item.fileName || item.documentType).join(" · "))}</strong>
                        <p>${escapeHtml(block2.documents.map((item) => `${item.documentType}/${item.rawFormat}/${item.sensitivityClass}`).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Variables parseadas</div>
                        <strong>${escapeHtml(block2.parsedVariables.map((item) => `${item.variableName}${item.normalizedValue !== undefined ? `=${typeof item.normalizedValue === "object" ? "[obj]" : item.normalizedValue}` : ""}`).slice(0, 8).join(" · "))}</strong>
                        <p>${escapeHtml(block2.parsedVariables.map((item) => `${item.extractionMethod}/${Math.round(item.parsingConfidence * 100)}%`).slice(0, 8).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Provenance</div>
                        <strong>${escapeHtml(block2.provenanceRecords.map((item) => item.sourceSystem).slice(0, 8).join(" · "))}</strong>
                        <p>${escapeHtml(block2.provenanceRecords.map((item) => `${item.acquisitionMethod}/${item.reliabilityLevel}`).slice(0, 8).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Mapping terminológico</div>
                        <strong>${escapeHtml(block2.terminologyMappings.map((item) => `${item.canonicalTerm}:${item.normalizedSystem} ${item.normalizedCode}`).slice(0, 8).join(" · "))}</strong>
                        <p>${escapeHtml(block2.terminologyCatalog.map((item) => item.display).slice(0, 8).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Certification status</div>
                        <strong>${escapeHtml(block2.datasetStatus.certificationStatus)}</strong>
                        <p>${escapeHtml(`completitud ${block2.datasetStatus.dataCompletenessIndex}% · tier ${block2.datasetStatus.dataReliabilityTier}`)}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Bloqueos y faltantes</div>
                        <strong>${escapeHtml(block2.datasetStatus.blockingReasons.length > 0 ? block2.datasetStatus.blockingReasons.join(" · ") : "sin bloqueos")}</strong>
                        <p>${escapeHtml(block2.datasetStatus.missingVariables.length > 0 ? block2.datasetStatus.missingVariables.join(" · ") : "sin faltantes esenciales")}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Bloque 2 aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block2/overview responda.</div>`
              }
            </section>

            <section id="knowledge-workspace" class="panel premium-panel">
              <div class="panel-header">
                <div>
                  <h2>Evidence Lake</h2>
                  <p>Lake científico mínimo con SER (Source Evidence Record), EO (Evidence Object), ICDR (Inter-Guideline Conflict / Divergence Record) y snapshot activo del caso demo.</p>
                </div>
                <span class="badge ${statusClass(evidenceLake ? "active" : "warn")}">${evidenceLake ? "conectado" : "pendiente"}</span>
              </div>
              ${
                evidenceLake
                  ? `
                    <section class="knowledge-hero">
                      <article class="knowledge-lead">
                        <div class="service-meta">Snapshot científico</div>
                        <strong>${escapeHtml(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.title : "No disponible")}</strong>
                        <p>${escapeHtml(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.summary : "Falta publicar snapshot.")}</p>
                        <div class="module-foot">
                          <span class="badge ${statusClass(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.status : "warn")}">${escapeHtml(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.status : "warn")}</span>
                          <span class="service-meta">${escapeHtml(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.vrn : "sin-vrn")}</span>
                        </div>
                        <div class="timeline-meta">hash ${escapeHtml(String(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.hash : "").slice(0, 18))}${evidenceLake.currentSnapshot ? "..." : ""}</div>
                      </article>
                      <div class="knowledge-metrics">
                        <article class="case-card">
                          <div class="service-meta">SER (Source Evidence Record) activos</div>
                          <strong>${escapeHtml(evidenceLake.activeSer.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">EO (Evidence Object) activos</div>
                          <strong>${escapeHtml(evidenceLake.activeEo.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">ICDR (Inter-Guideline Conflict / Divergence Record) abiertos</div>
                          <strong>${escapeHtml(evidenceLake.openIcdr.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Snapshot</div>
                          <strong>${escapeHtml(evidenceLake.currentSnapshot ? evidenceLake.currentSnapshot.snapshotId : "sin snapshot")}</strong>
                        </article>
                      </div>
                    </section>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">SER (Source Evidence Record) activos</div>
                        <strong>${escapeHtml(evidenceLake.activeSer.map((item) => item.serId).join(", "))}</strong>
                        <p>${escapeHtml(evidenceLake.activeSer.map((item) => item.authority).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">EO (Evidence Object) activos</div>
                        <strong>${escapeHtml(evidenceLake.activeEo.map((item) => item.eoId).join(", "))}</strong>
                        <p>${escapeHtml(evidenceLake.activeEo.map((item) => item.domain).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">ICDR (Inter-Guideline Conflict / Divergence Record) abiertos</div>
                        <strong>${escapeHtml(evidenceLake.openIcdr.map((item) => item.icdrId).join(", "))}</strong>
                        <p>${escapeHtml(evidenceLake.openIcdr.map((item) => item.topic).join(" · "))}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Evidence Lake aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block3/evidence-lake/summary responda.</div>`
              }
            </section>

            <section id="timeline-workspace" class="panel premium-panel">
              <div class="panel-header">
                <div>
                  <h2>Guideline Package / Clinical Pathway Object (GP / CPO)</h2>
                  <p>Compilación operativa de Guideline Package, frameworks y Clinical Pathway Object del caso demo.</p>
                </div>
                <span class="badge ${statusClass(gpCpo && gpCpo.kbol && gpCpo.kbol.cpo ? "active" : "warn")}">${gpCpo && gpCpo.kbol && gpCpo.kbol.cpo ? "emitido" : "pendiente"}</span>
              </div>
              ${
                gpCpo && gpCpo.guidelineHub && gpCpo.kbol
                  ? `
                    <section class="focus-band">
                      <article class="focus-card focus-card-pathway">
                        <div class="service-meta">Pathway object</div>
                        <strong>${escapeHtml(gpCpo.kbol.cpo ? gpCpo.kbol.cpo.cpoId : "sin CPO")}</strong>
                        <p>${escapeHtml(gpCpo.kbol.cpo ? `Gate ${gpCpo.kbol.cpo.ddmoGateStatus} con status ${gpCpo.kbol.cpo.status}.` : "Todavía no existe un Clinical Pathway Object emitido para el caso.")}</p>
                      </article>
                      <div class="focus-metrics">
                        <article class="case-card">
                          <div class="service-meta">GP (Guideline Package) activo</div>
                          <strong>${escapeHtml(gpCpo.guidelineHub.guidelinePackage.gpId)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Frameworks activos</div>
                          <strong>${escapeHtml(gpCpo.kbol.frameworks.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">CPO (Clinical Pathway Object)</div>
                          <strong>${escapeHtml(gpCpo.kbol.cpo ? gpCpo.kbol.cpo.cpoId : "sin CPO")}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Gate</div>
                          <strong>${escapeHtml(gpCpo.kbol.cpo ? gpCpo.kbol.cpo.ddmoGateStatus : gpCpo.kbol.datasetGate.certificationStatus)}</strong>
                        </article>
                      </div>
                    </section>
                    <div class="case-grid">
                      <article class="case-card">
                        <div class="service-meta">GP (Guideline Package) activo</div>
                        <strong>${escapeHtml(gpCpo.guidelineHub.guidelinePackage.gpId)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Frameworks activos</div>
                        <strong>${escapeHtml(gpCpo.kbol.frameworks.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">CPO (Clinical Pathway Object)</div>
                        <strong>${escapeHtml(gpCpo.kbol.cpo ? gpCpo.kbol.cpo.cpoId : "sin CPO")}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Gate</div>
                        <strong>${escapeHtml(gpCpo.kbol.cpo ? gpCpo.kbol.cpo.ddmoGateStatus : gpCpo.kbol.datasetGate.certificationStatus)}</strong>
                      </article>
                    </div>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">EO (Evidence Object) agrupados</div>
                        <strong>${escapeHtml(gpCpo.guidelineHub.eoGroups.map((item) => item.groupLabel).join(", "))}</strong>
                        <p>${escapeHtml(gpCpo.guidelineHub.eoGroups.map((item) => `${item.groupLabel}: ${item.eoIds.length}`).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Frameworks</div>
                        <strong>${escapeHtml(gpCpo.kbol.frameworks.map((item) => item.frameworkId).join(", "))}</strong>
                        <p>${escapeHtml(gpCpo.kbol.frameworks.map((item) => item.status).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Dependencias</div>
                        <strong>${escapeHtml(gpCpo.kbol.dependencies.map((item) => `${item.frameworkId}→${item.dependsOnFrameworkId}`).join(", "))}</strong>
                        <p>${escapeHtml(gpCpo.kbol.dependencies.map((item) => item.reason).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Flags</div>
                        <strong>${escapeHtml(gpCpo.kbol.cpo ? `${gpCpo.kbol.cpo.status}` : "sin emisión")}</strong>
                        <p>${escapeHtml(gpCpo.kbol.cpo ? `freeze=${gpCpo.kbol.cpo.freezeFlag} · review=${gpCpo.kbol.cpo.reviewFlag} · auto=${gpCpo.kbol.cpo.notAutoExecutable ? "no" : "si"}` : "Sin CPO (Clinical Pathway Object) emitido.")}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Guideline Package / Clinical Pathway Object (GP / CPO) aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block5/gp-cpo/summary responda.</div>`
              }
            </section>

            <section id="readiness-workspace" class="panel premium-panel readiness-panel">
              <div class="panel-header">
                <div>
                  <h2>Runbook Object / Readiness (RO)</h2>
                  <p>Preparación operativa derivada del CPO (Clinical Pathway Object): checklist por actor, BOM (Bill of Materials), TAM (Temporal Activation Model), EVT (Event Trigger) y Readiness global.</p>
                </div>
                <span class="badge ${statusClass(readiness && readiness.readiness && readiness.readiness.readinessSnapshot ? (readiness.readiness.readinessSnapshot.overallStatus === "PASS" ? "active" : "bad") : "warn")}">${escapeHtml(readiness && readiness.readiness && readiness.readiness.readinessSnapshot ? readiness.readiness.readinessSnapshot.overallStatus : "pendiente")}</span>
              </div>
              ${
                readiness && readiness.runbook && readiness.readiness
                  ? `
                    <section class="focus-band">
                      <article class="focus-card focus-card-readiness">
                        <div class="service-meta">Readiness snapshot</div>
                        <strong>${escapeHtml(readiness.readiness.readinessSnapshot ? readiness.readiness.readinessSnapshot.overallStatus : "sin snapshot")}</strong>
                        <p>${escapeHtml(readiness.readiness.blockingReasons.length > 0 ? readiness.readiness.blockingReasons.map((item) => item.message).join(" · ") : "Sin bloqueos críticos declarados para la ruta activa.")}</p>
                      </article>
                      <div class="focus-metrics">
                        <article class="case-card">
                          <div class="service-meta">Runbook</div>
                          <strong>${escapeHtml(readiness.runbook.runbook.runbookId)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Actores</div>
                          <strong>${escapeHtml(readiness.runbook.actorMatrix.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Eventos críticos</div>
                          <strong>${escapeHtml(readiness.runbook.evt.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Readiness</div>
                          <strong>${escapeHtml(readiness.readiness.readinessSnapshot ? readiness.readiness.readinessSnapshot.overallStatus : "sin snapshot")}</strong>
                        </article>
                      </div>
                    </section>
                    <div class="case-grid">
                      <article class="case-card">
                        <div class="service-meta">Runbook</div>
                        <strong>${escapeHtml(readiness.runbook.runbook.runbookId)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Actores</div>
                        <strong>${escapeHtml(readiness.runbook.actorMatrix.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Eventos críticos</div>
                        <strong>${escapeHtml(readiness.runbook.evt.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Readiness</div>
                        <strong>${escapeHtml(readiness.readiness.readinessSnapshot ? readiness.readiness.readinessSnapshot.overallStatus : "sin snapshot")}</strong>
                      </article>
                    </div>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">Checklist por actor</div>
                        <strong>${escapeHtml(readiness.runbook.actorMatrix.map((item) => item.actorRole).join(", "))}</strong>
                        <p>${escapeHtml(readiness.runbook.actorMatrix.map((item) => `${item.actorRole}: ${item.stepIds.length} pasos`).join(" · "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Recursos requeridos</div>
                        <strong>${escapeHtml(readiness.runbook.bom.map((item) => item.label).join(" · "))}</strong>
                        <p>${escapeHtml(readiness.runbook.bom.map((item) => `${item.category}/${item.availabilityStatus}`).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Timeline TAM (Temporal Activation Model)</div>
                        <strong>${escapeHtml(readiness.runbook.tam.map((item) => item.title).join(" → "))}</strong>
                        <p>${escapeHtml(readiness.runbook.tam.map((item) => item.objective).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">EVT (Event Trigger)</div>
                        <strong>${escapeHtml(readiness.runbook.evt.map((item) => item.label).join(", "))}</strong>
                        <p>${escapeHtml(readiness.runbook.evt.map((item) => `${item.severity}/${item.responseOwner}`).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Readiness gates</div>
                        <strong>${escapeHtml(readiness.readiness.readinessGates.map((item) => `${item.label}:${item.status}`).join(" · "))}</strong>
                        <p>${escapeHtml(readiness.readiness.readinessGates.map((item) => item.evidence).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Bloqueos</div>
                        <strong>${escapeHtml(readiness.readiness.blockingReasons.length > 0 ? readiness.readiness.blockingReasons.map((item) => item.message).join(" · ") : "sin bloqueos")}</strong>
                        <p>${escapeHtml(readiness.readiness.readinessSnapshot ? `snapshot ${readiness.readiness.readinessSnapshot.snapshotId}` : "sin snapshot")}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Runbook Object / Readiness (RO) aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block6/readiness/summary responda.</div>`
              }
            </section>

            <section id="state-machine-workspace" class="panel premium-panel state-panel">
              <div class="panel-header">
                <div>
                  <h2>Case control / state machine</h2>
                  <p>Activación formal del caso, timeline de estados, STC (State Transition Capture), ESL (Evidence Snapshot Legal) y overrides visibles.</p>
                </div>
                <span class="badge ${statusClass(caseControl && caseControl.caseControl && caseControl.caseControl.caseControl ? "active" : "warn")}">${escapeHtml(caseControl && caseControl.caseControl && caseControl.caseControl.caseControl ? caseControl.caseControl.caseControl.currentState : "pendiente")}</span>
              </div>
              ${
                caseControl && caseControl.caseControl
                  ? `
                    <section class="focus-band">
                      <article class="focus-card focus-card-state">
                        <div class="service-meta">Current state</div>
                        <strong>${escapeHtml(caseControl.caseControl.caseControl ? caseControl.caseControl.caseControl.currentState : "sin control")}</strong>
                        <p>${escapeHtml(caseControl.caseControl.transitions.length > 0 ? caseControl.caseControl.transitions.map((item) => item.toState).join(" → ") : "Aún no hay transiciones registradas en la state machine.")}</p>
                      </article>
                      <div class="focus-metrics">
                        <article class="case-card">
                          <div class="service-meta">Estado actual</div>
                          <strong>${escapeHtml(caseControl.caseControl.caseControl ? caseControl.caseControl.caseControl.currentState : "sin control")}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Timeline</div>
                          <strong>${escapeHtml(caseControl.caseControl.transitions.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">STC (State Transition Capture)</div>
                          <strong>${escapeHtml(caseControl.caseControl.captures.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">ESL (Evidence Snapshot Legal)</div>
                          <strong>${escapeHtml(caseControl.caseControl.legalSnapshots.length)}</strong>
                        </article>
                      </div>
                    </section>
                    <div class="case-grid">
                      <article class="case-card">
                        <div class="service-meta">Estado actual</div>
                        <strong>${escapeHtml(caseControl.caseControl.caseControl ? caseControl.caseControl.caseControl.currentState : "sin control")}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Timeline</div>
                        <strong>${escapeHtml(caseControl.caseControl.transitions.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">STC (State Transition Capture)</div>
                        <strong>${escapeHtml(caseControl.caseControl.captures.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">ESL (Evidence Snapshot Legal)</div>
                        <strong>${escapeHtml(caseControl.caseControl.legalSnapshots.length)}</strong>
                      </article>
                    </div>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">Timeline visual</div>
                        <strong>${escapeHtml(caseControl.caseControl.transitions.map((item) => item.toState).join(" → "))}</strong>
                        <p>${escapeHtml(caseControl.caseControl.transitions.map((item) => item.reason).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">STC (State Transition Capture) acumulado</div>
                        <strong>${escapeHtml(caseControl.caseControl.captures.map((item) => item.actorRole).join(" · "))}</strong>
                        <p>${escapeHtml(caseControl.caseControl.captures.map((item) => item.summary).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">ESL (Evidence Snapshot Legal) visibles</div>
                        <strong>${escapeHtml(caseControl.caseControl.legalSnapshots.map((item) => item.snapshotType).join(", "))}</strong>
                        <p>${escapeHtml(caseControl.caseControl.legalSnapshots.map((item) => item.summary).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Overrides</div>
                        <strong>${escapeHtml(caseControl.caseControl.overrides.length > 0 ? caseControl.caseControl.overrides.map((item) => `${item.overrideType}:${item.status}`).join(" · ") : "sin overrides")}</strong>
                        <p>${escapeHtml(caseControl.caseControl.overrides.length > 0 ? caseControl.caseControl.overrides.map((item) => `${item.signedBy}/${item.justification}`).join(" | ") : "No hay overrides activos.")}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Logs</div>
                        <strong>${escapeHtml(caseControl.caseControl.logs.join(" · "))}</strong>
                        <p>${escapeHtml("case.activated · case.transitioned · legal.snapshot.created · override.created")}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Case control aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block7/case-control/summary responda.</div>`
              }
            </section>

            <section id="systemic-workspace" class="panel premium-panel systemic-panel">
              <div class="panel-header">
                <div>
                  <h2>Systemic Risk / Clinical Outcomes / Drift (SRM / CQOI)</h2>
                  <p>Inteligencia institucional agregada sin write-back al caso: señales sistémicas, DTQ (Data Trust & Quality), CQOI (Clinical Quality Outcome Intelligence) y drift.</p>
                </div>
                <span class="badge ${statusClass(systemicControl && systemicControl.systemicRisk && systemicControl.cqoi ? "active" : "warn")}">${escapeHtml(systemicControl && systemicControl.systemicRisk && systemicControl.cqoi ? "conectado" : "pendiente")}</span>
              </div>
              ${
                systemicControl && systemicControl.systemicRisk && systemicControl.cqoi
                  ? `
                    <section class="focus-band">
                      <article class="focus-card focus-card-systemic">
                        <div class="service-meta">Institutional control plane</div>
                        <strong>${escapeHtml(systemicControl.cqoi.qualityReport.summary)}</strong>
                        <p>${escapeHtml(systemicControl.cqoi.driftRecords.length > 0 ? systemicControl.cqoi.driftRecords.map((item) => item.summary).join(" · ") : "Sin drift relevante publicado para esta cohorte.")}</p>
                      </article>
                      <div class="focus-metrics">
                        <article class="case-card">
                          <div class="service-meta">Señales SRM</div>
                          <strong>${escapeHtml(systemicControl.systemicRisk.signals.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">DTQ score</div>
                          <strong>${escapeHtml(systemicControl.systemicRisk.dtq.traceabilityScore.overallScore)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Métricas CQOI</div>
                          <strong>${escapeHtml(systemicControl.cqoi.metrics.length)}</strong>
                        </article>
                        <article class="case-card">
                          <div class="service-meta">Drift records</div>
                          <strong>${escapeHtml(systemicControl.cqoi.driftRecords.length)}</strong>
                        </article>
                      </div>
                    </section>
                    <div class="case-grid">
                      <article class="case-card">
                        <div class="service-meta">Señales SRM</div>
                        <strong>${escapeHtml(systemicControl.systemicRisk.signals.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">DTQ score</div>
                        <strong>${escapeHtml(systemicControl.systemicRisk.dtq.traceabilityScore.overallScore)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Métricas CQOI</div>
                        <strong>${escapeHtml(systemicControl.cqoi.metrics.length)}</strong>
                      </article>
                      <article class="case-card">
                        <div class="service-meta">Drift records</div>
                        <strong>${escapeHtml(systemicControl.cqoi.driftRecords.length)}</strong>
                      </article>
                    </div>
                    <div class="module-grid">
                      <article class="module-item">
                        <div class="service-meta">Panel de señales sistémicas</div>
                        <strong>${escapeHtml(systemicControl.systemicRisk.signals.map((item) => item.label).join(", "))}</strong>
                        <p>${escapeHtml(systemicControl.systemicRisk.signals.map((item) => `${item.severity}/${item.metricValue}${item.unit}`).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Panel calidad dato</div>
                        <strong>${displayHtml(`traceability ${systemicControl.systemicRisk.dtq.traceabilityScore.overallScore} · STC ${systemicControl.systemicRisk.dtq.traceabilityScore.stcCoverage} · ESL ${systemicControl.systemicRisk.dtq.traceabilityScore.eslCoverage}`)}</strong>
                        <p>${escapeHtml(systemicControl.systemicRisk.dtq.dataQualityRecords.map((item) => `${item.category}:${item.status} ${item.anomalyFlags.join(",") || "sin flags"}`).join(" | "))}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Panel CQOI</div>
                        <strong>${escapeHtml(systemicControl.cqoi.metrics.map((item) => `${item.code}:${item.value}${item.unit}`).join(" · "))}</strong>
                        <p>${escapeHtml(systemicControl.cqoi.qualityReport.summary)}</p>
                      </article>
                      <article class="module-item">
                        <div class="service-meta">Panel drift</div>
                        <strong>${escapeHtml(systemicControl.cqoi.driftRecords.map((item) => item.driftType).join(", "))}</strong>
                        <p>${escapeHtml(systemicControl.cqoi.driftRecords.map((item) => `${item.summary} (${item.baseline}→${item.observed})`).join(" | "))}</p>
                      </article>
                    </div>
                  `
                  : `<div class="empty-state">Systemic Risk / Clinical Outcomes / Drift (SRM / CQOI) aparecerá aquí cuando ` + escapeHtml(state.gatewayBase) + `/block8/systemic-control/summary responda.</div>`
              }
            </section>

            <section class="panel premium-panel module-catalog-panel">
              <div class="panel-header">
                <div>
                  <h2>Módulos de bloque</h2>
                  <p>Superficie viva para enriquecer el tablero conforme se publiquen nuevos endpoints.</p>
                </div>
                <span class="badge warn">hook-based</span>
              </div>
              <div class="module-grid">
                ${moduleSnapshots
                  .map(({ definition, moduleState }) => {
                    return `
                      <article class="module-item">
                        <div class="service-meta">${displayHtml(definition.title)}</div>
                        <strong>${displayHtml(moduleState.headline)}</strong>
                        <p>${displayHtml(moduleState.detail)}</p>
                        <div class="module-foot">
                          <span class="badge ${statusClass(moduleState.status)}">${escapeHtml(moduleState.status)}</span>
                          <span class="service-meta">${escapeHtml(definition.hook)}</span>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          </div>

          <div class="column operator-column">
            <section class="panel operator-rail">
              <div class="panel-header">
                <div>
                  <h3>Operator Rail</h3>
                  <p>Zona de ejecución para mover el caso, revisar auditoría y saltar entre superficies operativas sin salir del contexto clínico.</p>
                </div>
                <span class="badge ${statusClass(actionTone)}">${escapeHtml(state.actionState)}</span>
              </div>
              <div class="operator-nav">
                <a class="operator-link" href="#walkthrough-rail">Walkthrough</a>
                <a class="operator-link" href="#actions-rail">Actions</a>
                <a class="operator-link" href="#audit-rail">Audit</a>
                <a class="operator-link" href="#hooks-rail">Hooks</a>
              </div>
              <div class="operator-summary">
                <article class="operator-summary-card">
                  <div class="service-meta">Current move</div>
                  <strong>${escapeHtml(recommendedActionLabel)}</strong>
                  <p>${escapeHtml(actionGuide)}</p>
                </article>
                <article class="operator-summary-card">
                  <div class="service-meta">Runtime</div>
                  <strong>${escapeHtml(gatewayLabel)}</strong>
                  <p>${escapeHtml(state.errors[0] || "Gateway y emulador escuchando endpoints locales.")}</p>
                </article>
              </div>
            </section>

            <section id="walkthrough-rail" class="panel operator-panel">
              <div class="panel-header">
                <div>
                  <h3>Walkthrough demo</h3>
                  <p>Secuencia guiada y ejecutable sobre el runtime real: login, ingestión, compilación, readiness, activación y transición.</p>
                </div>
                <span class="badge ${statusClass(walkthroughTone)}">${escapeHtml(state.walkthroughState)}</span>
              </div>
              <div class="walkthrough-stack">
                <div class="walkthrough-summary">
                  <div>
                    <div class="service-meta">Progreso</div>
                    <strong>${escapeHtml(completedWalkthroughSteps)} / ${escapeHtml(walkthroughSteps.length)} etapas</strong>
                  </div>
                  <div class="progress-meter" aria-hidden="true">
                    <div class="progress-meter-fill ${state.walkthroughState === "working" ? "progress-meter-fill-animated" : ""}" style="width: ${walkthroughProgressPercent}%"></div>
                  </div>
                  <p>${escapeHtml(state.walkthroughMessage)}</p>
                </div>
                <button class="primary walkthrough-button" id="runWalkthroughButton" type="button">${state.walkthroughState === "working" ? "Walkthrough ejecutándose" : "Ejecutar walkthrough completo"}</button>
                <div class="walkthrough-steps">
                  ${walkthroughSteps
                    .map(
                      (step, index) => `
                        <article class="walkthrough-step walkthrough-step-${statusClass(step.status)} ${activeWalkthroughIndex === index ? "walkthrough-step-active" : ""}">
                          <div class="walkthrough-step-top">
                            <span class="walkthrough-index">${index + 1}</span>
                            <strong>${escapeHtml(step.label)}</strong>
                            <span class="badge ${activeWalkthroughIndex === index ? "warn" : statusClass(step.status)}">${escapeHtml(activeWalkthroughIndex === index ? "running" : step.status)}</span>
                          </div>
                          <p>${escapeHtml(step.detail)}</p>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
                <div class="hook-list">
                  ${state.walkthroughHistory.length > 0
                    ? state.walkthroughHistory
                        .map(
                          (item) => `
                            <article class="hook-item">
                              <strong>${escapeHtml(item.message)}</strong>
                              <div class="timeline-meta">${escapeHtml(formatTime(item.createdAt))}</div>
                            </article>
                          `,
                        )
                        .join("")
                    : `<div class="empty-state">Todavía no se ejecuta el walkthrough. Puedes correrlo completo o avanzar paso a paso con los controles existentes.</div>`}
                </div>
              </div>
            </section>

            <section class="panel operator-panel">
              <div class="panel-header">
                <div>
                  <h3>Glosario visible</h3>
                  <p>Siglas desplegadas directamente en el HTML para que el tablero sea legible sin abrir documentación aparte.</p>
                </div>
                <span class="badge ok">inline</span>
              </div>
              <div class="hook-list">
                ${glossaryHighlights
                  .map((item) => `<article class="hook-item"><strong>${escapeHtml(item)}</strong></article>`)
                  .join("")}
              </div>
            </section>

            <section id="actions-rail" class="panel operator-panel">
              <div class="panel-header">
                <div>
                  <h3>Flujo demo accionable</h3>
                  <p>Login, ingestión, compilación, readiness y transición del caso desde el propio emulador.</p>
                </div>
                <span class="badge ${statusClass(state.actionState === "failed" ? "bad" : state.actionState === "working" ? "warn" : "ok")}">${escapeHtml(state.actionState)}</span>
              </div>
              <div class="action-stack">
                <div class="action-guide ${statusClass(recommendedActionKey === "done" ? "ok" : "warn")}">
                  <div class="service-meta">Siguiente movimiento recomendado</div>
                  <strong>${escapeHtml(recommendedActionLabel)}</strong>
                  <p>${escapeHtml(actionGuide)}</p>
                </div>
                <form class="input-grid" id="loginForm">
                  <input name="email" value="${escapeHtml(state.session && state.session.user ? state.session.user.email : "admin@icicso.local")}" placeholder="Email" />
                  <input name="password" type="password" value="Admin123!" placeholder="Password" />
                  <button class="primary ${recommendedActionKey === "login" ? "button-emphasis" : ""}" type="submit">${state.session ? "Reautenticar" : "Iniciar sesión"}</button>
                  <button class="secondary" id="logoutButton" type="button">Cerrar sesión local</button>
                </form>
                <form class="input-grid" id="uploadPresetForm">
                  <select name="presetKey">
                    ${Object.entries(demoUploadPresets)
                      .map(
                        ([presetKey, preset]) => `
                          <option value="${escapeHtml(presetKey)}">${escapeHtml(preset.label)}</option>
                        `,
                      )
                      .join("")}
                  </select>
                  <button class="primary ${recommendedActionKey === "upload" ? "button-emphasis" : ""}" type="submit">Simular upload estructurado</button>
                  <div class="field-help">Caso activo: ${escapeHtml(currentCaseId)}. El upload dispara parsing, provenance, mapping y recertificación.</div>
                </form>
                <div class="action-grid">
                  <button class="secondary ${recommendedActionKey === "compile" ? "active button-emphasis" : ""}" id="compileButton" type="button">Compilar Guideline Package / Clinical Pathway Object</button>
                  <button class="secondary ${recommendedActionKey === "readiness" ? "active button-emphasis" : ""}" id="readinessButton" type="button">Reevaluar readiness</button>
                  <button class="secondary ${recommendedActionKey === "activate" ? "active button-emphasis" : ""}" id="activateButton" type="button">Activar caso</button>
                  <button class="secondary ${recommendedActionKey === "advance" ? "active button-emphasis" : ""}" id="advanceButton" type="button">${escapeHtml(nextCaseState ? `Avanzar a ${nextCaseState}` : "Sin siguiente transición")}</button>
                </div>
                <div class="status-box">
                  <div class="service-meta">Secuencia sugerida</div>
                  <strong>1. login  2. upload  3. compilar  4. readiness  5. activar  6. avanzar</strong>
                  <p>${escapeHtml(currentCaseState ? `Estado actual del caso: ${currentCaseState}.` : "El caso todavía no está activado en la state machine.")}</p>
                </div>
              </div>
            </section>

            <section id="audit-rail" class="panel operator-panel">
              <div class="panel-header">
                <div>
                  <h3>Timeline de dominio</h3>
                  <p>Eventos de auditoría y dominio visibles en orden inverso.</p>
                </div>
                <span class="badge ${statusClass(timeline.length > 0 ? "ok" : "warn")}">${escapeHtml(timeline.length)} eventos</span>
              </div>
              <div class="timeline">
                ${timeline.length > 0
                  ? timeline
                      .map(
                        (event) => `
                          <article class="timeline-item timeline-item-premium">
                            <div class="timeline-marker"></div>
                            <strong>${escapeHtml(event.eventType)}</strong>
                            <div class="timeline-meta">${escapeHtml(event.targetCaseId || "sin caseId")} · ${escapeHtml(formatTime(event.createdAt))}</div>
                            <div class="timeline-meta">hash ${escapeHtml(String(event.hash || "").slice(0, 18))}...</div>
                          </article>
                        `,
                      )
                      .join("")
                  : `<div class="empty-state">Sin timeline disponible. En Bloque 1 se alimenta desde /audit/events a través de /block1/overview.</div>`}
              </div>
            </section>

            <section id="hooks-rail" class="panel operator-panel">
              <div class="panel-header">
                <div>
                  <h3>Mapa de hooks</h3>
                  <p>Lista explícita de endpoints que el tablero espera ir resolviendo por bloque.</p>
                </div>
                <span class="badge warn">extensible</span>
              </div>
              <div class="hook-list">
                <article class="hook-item">
                  <strong>Overview base</strong>
                  <div class="hook-path">${escapeHtml(state.gatewayBase)}/block1/overview</div>
                  <div class="timeline-meta">Gateway de entrada para salud, caso demo y timeline.</div>
                </article>
                ${moduleDefinitions
                  .map(
                    (definition) => `
                      <article class="hook-item">
                        <strong>${displayHtml(definition.title)}</strong>
                        <div class="hook-path">${escapeHtml(state.gatewayBase)}${escapeHtml(definition.hook)}</div>
                        <div class="timeline-meta">${displayHtml(definition.summary)}</div>
                      </article>
                    `,
                  )
                  .join("")}
              </div>
            </section>
          </div>
        </section>
      </div>
    `;

    document.getElementById("gatewayBase").addEventListener("change", (event) => {
      const nextValue = event.target.value.trim();
      state.gatewayBase = nextValue || getDefaultGatewayBase();
      localStorage.setItem("icicso.gatewayBase", state.gatewayBase);
      refresh();
    });

    document.getElementById("refreshNow").addEventListener("click", () => {
      refresh();
    });

    document.getElementById("toggleAutoRefresh").addEventListener("click", () => {
      state.autoRefresh = !state.autoRefresh;
      localStorage.setItem("icicso.autoRefresh", String(state.autoRefresh));
      syncTimer();
      render();
    });

    document.getElementById("runWalkthroughButton").addEventListener("click", async () => {
      if (state.walkthroughState === "working") {
        return;
      }
      await runWalkthrough();
    });

    document.getElementById("loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      await runAction("Autenticando usuario demo", async () => {
        const session = await requestJson("/auth/login", {
          method: "POST",
          body: {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
          },
        });
        setSession(session);
        return `Sesión iniciada como ${session.user ? session.user.email : "usuario local"}.`;
      });
    });

    document.getElementById("logoutButton").addEventListener("click", async () => {
      setSession(null);
      state.actionState = "idle";
      state.actionMessage = "Sesión local eliminada del emulador.";
      render();
    });

    document.getElementById("uploadPresetForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const presetKey = String(formData.get("presetKey") || "renalLabs");
      const preset = demoUploadPresets[presetKey] || demoUploadPresets.renalLabs;
      await runAction(`Ingestando ${preset.label}`, async () => {
        const result = await requestJson("/ingestion/ingestions/structured", {
          method: "POST",
          body: {
            caseId: getDemoCaseId(),
            ...preset.request,
          },
        });
        return result;
      });
    });

    document.getElementById("compileButton").addEventListener("click", async () => {
      await runAction("Compilando GP, CPO y runbook", async () => {
        const caseId = encodeURIComponent(getDemoCaseId());
        const guidelinePackage = await requestJson(`/ghl/packages/publish?caseId=${caseId}`, { method: "POST" });
        const cpo = await requestJson(`/kbol/cpo/generate?caseId=${caseId}`, { method: "POST" });
        const runbook = await requestJson(`/runbook/runbook/generate?caseId=${caseId}`, { method: "POST" });
        return { guidelinePackage, cpo, runbook };
      });
    });

    document.getElementById("readinessButton").addEventListener("click", async () => {
      await runAction("Reevaluando readiness", async () => {
        const caseId = encodeURIComponent(getDemoCaseId());
        return requestJson(`/readiness/readiness/evaluate?caseId=${caseId}`, { method: "POST" });
      });
    });

    document.getElementById("activateButton").addEventListener("click", async () => {
      await runAction("Activando caso en state machine", async () => {
        const caseId = encodeURIComponent(getDemoCaseId());
        return requestJson(`/case-control/activate?caseId=${caseId}&actorRole=case-controller`, { method: "POST" });
      });
    });

    document.getElementById("advanceButton").addEventListener("click", async () => {
      const nextState = getNextCaseState(getCaseControlState());
      if (!nextState) {
        state.actionState = "idle";
        state.actionMessage = "No existe siguiente transición disponible para el estado actual.";
        render();
        return;
      }

      await runAction(`Transicionando a ${nextState}`, async () => {
        const caseId = encodeURIComponent(getDemoCaseId());
        return requestJson(`/case-control/transition?caseId=${caseId}`, {
          method: "POST",
          body: {
            toState: nextState,
            reason: `Avance controlado del walkthrough demo hacia ${nextState}.`,
            actorRole: "case-controller",
          },
        });
      });
    });
  }

  function randomHex(bytes) {
    const buffer = new Uint8Array(bytes);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  function buildTelemetryHeaders() {
    const traceId = randomHex(16);
    const spanId = randomHex(8);
    const correlationId = typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : randomHex(16);
    const requestId = typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : randomHex(16);

    return {
      "X-Correlation-Id": correlationId,
      "X-Request-Id": requestId,
      traceparent: `00-${traceId}-${spanId}-01`,
    };
  }

  async function fetchJson(url, init) {
    const response = await fetch(url, {
      method: init && init.method ? init.method : "GET",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        ...(state.session && state.session.token ? { Authorization: `Bearer ${state.session.token}` } : {}),
        ...buildTelemetryHeaders(),
        ...(init && init.headers ? init.headers : {}),
      },
      body: init && init.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const errorPayload = await response.json();
        if (errorPayload && errorPayload.message) {
          message = errorPayload.message;
        }
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function requestJson(path, init) {
    return fetchJson(`${state.gatewayBase}${path}`, init);
  }

  async function runAction(label, action) {
    state.actionState = "working";
    state.actionMessage = label;
    render();

    try {
      const result = await action();
      state.actionState = "ok";
      state.actionMessage = summarizeResult(result);
      await refresh();
      return result;
    } catch (error) {
      state.actionState = "failed";
      state.actionMessage = error instanceof Error ? error.message : "Acción fallida";
      render();
      throw error;
    }
  }

  async function refresh() {
    state.errors = [];

    try {
      state.gatewayHealth = await fetchJson(`${state.gatewayBase}/health`);
    } catch (error) {
      state.gatewayHealth = null;
      state.errors.push(`gateway ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.overview = await fetchJson(`${state.gatewayBase}/block1/overview`);
    } catch (error) {
      state.overview = null;
      state.errors.push(`overview ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.block2Overview = await fetchJson(`${state.gatewayBase}/block2/overview`);
    } catch (error) {
      state.block2Overview = null;
      state.errors.push(`block2 ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.evidenceLakeOverview = await fetchJson(`${state.gatewayBase}/block3/evidence-lake/summary`);
    } catch (error) {
      state.evidenceLakeOverview = null;
      state.errors.push(`evidence-lake ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.gpCpoOverview = await fetchJson(`${state.gatewayBase}/block5/gp-cpo/summary`);
    } catch (error) {
      state.gpCpoOverview = null;
      state.errors.push(`gp-cpo ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.runbookReadinessOverview = await fetchJson(`${state.gatewayBase}/block6/readiness/summary`);
    } catch (error) {
      state.runbookReadinessOverview = null;
      state.errors.push(`readiness ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.caseControlOverview = await fetchJson(`${state.gatewayBase}/block7/case-control/summary`);
    } catch (error) {
      state.caseControlOverview = null;
      state.errors.push(`case-control ${error instanceof Error ? error.message : "down"}`);
    }

    try {
      state.systemicControlOverview = await fetchJson(`${state.gatewayBase}/block8/systemic-control/summary`);
    } catch (error) {
      state.systemicControlOverview = null;
      state.errors.push(`systemic-control ${error instanceof Error ? error.message : "down"}`);
    }

    state.lastRefreshAt = new Date().toISOString();
    render();
  }

  function syncTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    if (state.autoRefresh) {
      state.timer = setInterval(refresh, state.refreshIntervalMs);
    }
  }

  render();
  syncTimer();
  refresh();
})();
