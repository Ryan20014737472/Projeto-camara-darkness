"use strict";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("reveal-ready");

  const reducedMotionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };
  const requestFrame =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 16);
  const revealItems = document.querySelectorAll(".reveal");

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.15 }
    );
    revealItems.forEach((item) => observer.observe(item));
  }

  function getHashTarget(hash) {
    if (!hash || hash === "#" || !hash.startsWith("#")) return null;

    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  function getAnchorTarget(link) {
    return getHashTarget(link.getAttribute("href"));
  }

  function focusTarget(target) {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");

    requestFrame(() => {
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }

      const target = getAnchorTarget(link);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        block: "start"
      });
      focusTarget(target);
      setCurrentNavigation(target.id);

      const hash = link.getAttribute("href");
      if (window.location.hash !== hash) {
        if (window.history && typeof window.history.pushState === "function") {
          window.history.pushState(null, "", hash);
        } else {
          window.location.hash = hash;
        }
      }
    });
  });

  const navigationLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const navigationTargets = navigationLinks
    .map(getAnchorTarget)
    .filter(Boolean);

  function setCurrentNavigation(targetId) {
    navigationLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === "#" + targetId;
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  const initialTarget = getHashTarget(window.location.hash);
  setCurrentNavigation(initialTarget ? initialTarget.id : "inicio");

  window.addEventListener("popstate", () => {
    const historyTarget = getHashTarget(window.location.hash);
    setCurrentNavigation(historyTarget ? historyTarget.id : "inicio");
  });

  if ("IntersectionObserver" in window) {
    const navigationObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) setCurrentNavigation(visibleEntry.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    navigationTargets.forEach((target) => navigationObserver.observe(target));
  }

  const stage = document.querySelector(".camera-stage");
  const apertureInput = document.querySelector("#aperture-control");
  const distanceInput = document.querySelector("#distance-control");
  const objectDistanceInput = document.querySelector("#object-distance-control");
  const lightInput = document.querySelector("#light-control");
  const apertureOutput = document.querySelector("#aperture-value");
  const distanceOutput = document.querySelector("#distance-value");
  const objectDistanceOutput = document.querySelector("#object-distance-value");
  const lightOutput = document.querySelector("#light-value");
  const result = document.querySelector("#sharpness-text");

  const resetButton = document.querySelector("#reset-simulator");
  const presetButtons = [...document.querySelectorAll(".preset-button")];
  const chosenAperture = document.querySelector("#chosen-aperture");
  const idealAperture = document.querySelector("#ideal-aperture");
  const chosenMarker = document.querySelector("#chosen-marker");
  const idealMarker = document.querySelector("#ideal-marker");
  const differenceText = document.querySelector("#aperture-difference");

  const raySourceTop = document.querySelector("#ray-source-top");
  const rayImageBottom = document.querySelector("#ray-image-bottom");
  const raySourceBottom = document.querySelector("#ray-source-bottom");
  const rayImageTop = document.querySelector("#ray-image-top");

  const challengeButton = document.querySelector("#start-challenge");
  const challengeProgress = document.querySelector("#challenge-progress");
  const challengeLight = document.querySelector("#challenge-light");
  const challengeAperture = document.querySelector("#challenge-aperture");
  const challengeSharpness = document.querySelector("#challenge-sharpness");
  const challengeMessage = document.querySelector("#challenge-message");

  if (
    !stage ||
    !apertureInput ||
    !distanceInput ||
    !objectDistanceInput ||
    !lightInput ||
    !apertureOutput ||
    !distanceOutput ||
    !objectDistanceOutput ||
    !lightOutput ||
    !result
  ) return;

  const MM_PER_CM = 10;
  const DIFFRACTION_FACTOR = 2.44;
  const EXPOSURE_COMPRESSION = 0.85;
  const WAVELENGTH_MM = 0.00055;
  const REFERENCE_APERTURE_MM = 0.5;
  const REFERENCE_IMAGE_DISTANCE_MM = 140;
  const REFERENCE_OBJECT_DISTANCE_MM = 2000;
  const REFERENCE_LIGHT = 0.7;
  const REFERENCE_FINITE_FACTOR =
    (REFERENCE_OBJECT_DISTANCE_MM /
      (REFERENCE_OBJECT_DISTANCE_MM + REFERENCE_IMAGE_DISTANCE_MM)) **
    2;
  const REFERENCE_MAGNIFICATION =
    REFERENCE_IMAGE_DISTANCE_MM / REFERENCE_OBJECT_DISTANCE_MM;
  const DEFAULTS = Object.freeze({
    aperture: 0.6,
    imageDistance: 12,
    objectDistance: 200,
    light: 70
  });
  const STATIC_PRESETS = Object.freeze({
    diffraction: Object.freeze({
      aperture: 0.1,
      imageDistance: 40,
      objectDistance: 200,
      light: 100
    }),
    blur: Object.freeze({
      aperture: 2.5,
      imageDistance: 40,
      objectDistance: 80,
      light: 100
    })
  });
  const CHALLENGE_START = Object.freeze({
    aperture: 0.2,
    imageDistance: 33,
    objectDistance: 200,
    light: 30
  });
  const THRESHOLDS = Object.freeze({
    exposureInvisible: 0.08,
    exposureVisible: 0.3,
    exposureWellLit: 0.75,
    exposureTooBright: 2.5,
    blurBest: 1.12,
    blurSharp: 1.45,
    blurSoft: 2.3,
    challengeBlur: 1.25,
    comparisonDeviation: 0.12,
    challengeDeviation: 0.15,
    apertureSmallFactor: 0.78,
    apertureLargeFactor: 1.32,
    magnificationSmall: 0.04,
    magnificationLarge: 0.12,
    lightLowPercent: 35,
    lightStrongPercent: 70
  });

  let challengeActive = false;
  let cameraFrameId = 0;
  let resultAnnouncementTimer = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const decimal = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

  function setTextIfChanged(element, text) {
    if (element && element.textContent !== text) element.textContent = text;
  }

  function scheduleCameraUpdate() {
    if (cameraFrameId) return;

    cameraFrameId = requestFrame(() => {
      cameraFrameId = 0;
      updateCamera();
    });
  }

  function queueResultAnnouncement() {
    result.setAttribute("aria-busy", "true");
    window.clearTimeout(resultAnnouncementTimer);
    resultAnnouncementTimer = window.setTimeout(() => {
      result.setAttribute("aria-busy", "false");
    }, 180);
  }

  function setPresetAvailability(disabled) {
    presetButtons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function calculateOptimalDiameter(imageDistanceCm, objectDistanceCm) {
    const imageDistanceMm = imageDistanceCm * MM_PER_CM;
    const objectDistanceMm = objectDistanceCm * MM_PER_CM;

    // Critério u = π adotado pela referência do NIST citada no projeto.
    return Math.sqrt(
      (2 * WAVELENGTH_MM * objectDistanceMm * imageDistanceMm) /
        (objectDistanceMm + imageDistanceMm)
    );
  }

  function calculateOpticalState({
    apertureMm,
    imageDistanceCm,
    objectDistanceCm,
    lightPercent
  }) {
    const imageDistanceMm = imageDistanceCm * MM_PER_CM;
    const objectDistanceMm = objectDistanceCm * MM_PER_CM;
    const lightLevel = lightPercent / 100;
    const magnification = imageDistanceMm / objectDistanceMm;
    const optimalDiameterMm = calculateOptimalDiameter(
      imageDistanceCm,
      objectDistanceCm
    );

    const geometricBlurMm = apertureMm * (1 + magnification);
    const diffractionBlurMm =
      (DIFFRACTION_FACTOR * WAVELENGTH_MM * imageDistanceMm) / apertureMm;
    const totalBlurMm = Math.hypot(geometricBlurMm, diffractionBlurMm);

    const referenceGeometricBlurMm =
      optimalDiameterMm * (1 + magnification);
    const referenceDiffractionBlurMm =
      (DIFFRACTION_FACTOR * WAVELENGTH_MM * imageDistanceMm) /
      optimalDiameterMm;
    const referenceBlurMm = Math.hypot(
      referenceGeometricBlurMm,
      referenceDiffractionBlurMm
    );
    const blurRatio = totalBlurMm / referenceBlurMm;

    const finiteDistanceFactor =
      (objectDistanceMm / (objectDistanceMm + imageDistanceMm)) ** 2;
    const relativeExposure =
      (lightLevel / REFERENCE_LIGHT) *
      (apertureMm / REFERENCE_APERTURE_MM) ** 2 *
      (REFERENCE_IMAGE_DISTANCE_MM / imageDistanceMm) ** 2 *
      (finiteDistanceFactor / REFERENCE_FINITE_FACTOR);

    const displayedExposure =
      1 - Math.exp(-EXPOSURE_COMPRESSION * relativeExposure);

    return {
      apertureMm,
      imageDistanceCm,
      imageDistanceMm,
      objectDistanceCm,
      objectDistanceMm,
      lightPercent,
      magnification,
      optimalDiameterMm,
      totalBlurMm,
      blurRatio,
      relativeExposure,
      displayedExposure,
      fNumber: imageDistanceMm / apertureMm
    };
  }

  function clearPreset() {
    presetButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function activatePreset(activeButton) {
    clearPreset();
    activeButton.setAttribute("aria-pressed", "true");
  }

  function setInputValue(input, value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    const minimum = Number(input.min);
    const maximum = Number(input.max);
    input.value = String(clamp(numericValue, minimum, maximum));
  }

  function readSimulatorValues() {
    const values = {
      apertureMm: Number(apertureInput.value),
      imageDistanceCm: Number(distanceInput.value),
      objectDistanceCm: Number(objectDistanceInput.value),
      lightPercent: Number(lightInput.value)
    };
    const numericValues = Object.values(values);

    if (
      numericValues.some((value) => !Number.isFinite(value)) ||
      values.apertureMm <= 0 ||
      values.imageDistanceCm <= 0 ||
      values.objectDistanceCm <= 0 ||
      values.lightPercent < 0
    ) {
      return null;
    }

    return values;
  }

  function setValues(values) {
    if (values.aperture !== undefined) {
      setInputValue(apertureInput, values.aperture);
    }
    if (values.imageDistance !== undefined) {
      setInputValue(distanceInput, values.imageDistance);
    }
    if (values.objectDistance !== undefined) {
      setInputValue(objectDistanceInput, values.objectDistance);
    }
    if (values.light !== undefined) {
      setInputValue(lightInput, values.light);
    }
    updateCamera();
  }

  function getPresetValues(preset) {
    if (preset === "ideal") {
      const ideal = calculateOptimalDiameter(
        Number(distanceInput.value),
        Number(objectDistanceInput.value)
      );
      return {
        aperture: Math.round(ideal * 100) / 100,
        light: DEFAULTS.light
      };
    }

    return STATIC_PRESETS[preset] || null;
  }

  function setRay(line, x1, y1, x2, y2) {
    if (!line) return;
    line.setAttribute("x1", x1.toFixed(1));
    line.setAttribute("y1", y1.toFixed(1));
    line.setAttribute("x2", x2.toFixed(1));
    line.setAttribute("y2", y2.toFixed(1));
  }

  function updateRayGeometry(imageDistanceCm, objectDistanceCm) {
    const objectPosition = clamp((objectDistanceCm - 50) / 450, 0, 1);
    const screenPosition = clamp((imageDistanceCm - 6) / 34, 0, 1);
    const sceneLeft = 23 - objectPosition * 21;
    const screenLeft = 61 + screenPosition * 15;

    stage.style.setProperty("--scene-left", sceneLeft.toFixed(2) + "%");
    stage.style.setProperty("--screen-left", screenLeft.toFixed(2) + "%");

    const sourceX = (sceneLeft + 12) * 10;
    const apertureX = 520;
    const apertureY = 215;
    const screenX = (screenLeft + 10.5) * 10;

    setRay(raySourceTop, sourceX, 105, apertureX, apertureY);
    setRay(rayImageBottom, apertureX, apertureY, screenX, 315);
    setRay(raySourceBottom, sourceX, 325, apertureX, apertureY);
    setRay(rayImageTop, apertureX, apertureY, screenX, 115);
  }

  function updateComparison(apertureMm, optimalDiameterMm) {
    setTextIfChanged(chosenAperture, decimal(apertureMm, 2) + " mm");
    setTextIfChanged(idealAperture, decimal(optimalDiameterMm, 2) + " mm");

    const min = Number(apertureInput.min);
    const max = Number(apertureInput.max);
    const chosenPosition = clamp(((apertureMm - min) / (max - min)) * 100, 0, 100);
    const idealPosition = clamp(((optimalDiameterMm - min) / (max - min)) * 100, 0, 100);
    if (chosenMarker) chosenMarker.style.left = chosenPosition.toFixed(2) + "%";
    if (idealMarker) idealMarker.style.left = idealPosition.toFixed(2) + "%";

    if (!differenceText) return;
    const signedDifference = (apertureMm - optimalDiameterMm) / optimalDiameterMm;
    const differencePercent = Math.abs(signedDifference) * 100;

    if (differencePercent <= THRESHOLDS.comparisonDeviation * 100) {
      setTextIfChanged(
        differenceText,
        "O valor escolhido está na faixa ideal para estas distâncias."
      );
    } else if (signedDifference < 0) {
      setTextIfChanged(
        differenceText,
        Math.round(differencePercent) +
          "% menor que o ideal: a difração tende a dominar."
      );
    } else {
      setTextIfChanged(
        differenceText,
        Math.round(differencePercent) +
          "% maior que o ideal: o borrão geométrico tende a dominar."
      );
    }
  }

  function markChallengeItem(item, complete) {
    if (!item) return;

    item.classList.toggle("done", complete);
    const label = item.textContent.trim();
    const accessibleLabel = (complete ? "Concluído: " : "Pendente: ") + label;
    if (item.getAttribute("aria-label") !== accessibleLabel) {
      item.setAttribute("aria-label", accessibleLabel);
    }
  }

  function resetChallengeView() {
    challengeActive = false;
    setPresetAvailability(false);
    if (challengeProgress) {
      challengeProgress.hidden = true;
      challengeProgress.classList.remove("complete");
    }
    [challengeLight, challengeAperture, challengeSharpness].forEach((item) =>
      markChallengeItem(item, false)
    );
    setTextIfChanged(challengeMessage, "Comece ajustando a iluminação.");
    if (challengeButton) {
      challengeButton.textContent = "Iniciar desafio";
      challengeButton.setAttribute("aria-expanded", "false");
    }
  }

  function updateChallenge(state) {
    if (!challengeActive || !challengeProgress) return;

    const visible = state.relativeExposure >= THRESHOLDS.exposureVisible;
    const nearIdeal =
      Math.abs(state.apertureMm - state.optimalDiameterMm) /
        state.optimalDiameterMm <=
      THRESHOLDS.challengeDeviation;
    const sharp = state.blurRatio <= THRESHOLDS.challengeBlur;

    markChallengeItem(challengeLight, visible);
    markChallengeItem(challengeAperture, nearIdeal);
    markChallengeItem(challengeSharpness, sharp);

    const complete = visible && nearIdeal && sharp;
    challengeProgress.classList.toggle("complete", complete);
    setTextIfChanged(
      challengeButton,
      complete ? "Tentar novamente" : "Reiniciar desafio"
    );

    if (!challengeMessage) return;

    let message;
    if (complete) {
      message =
        "Desafio concluído: a projeção está visível e próxima da melhor definição calculada.";
    } else if (!visible) {
      message =
        "A projeção ainda está escura. Aumente a iluminação ou abra um pouco o orifício.";
    } else if (!nearIdeal) {
      message =
        state.apertureMm < state.optimalDiameterMm
          ? "O orifício está pequeno demais. Aumente-o em direção ao marcador ideal."
          : "O orifício está grande demais. Reduza-o em direção ao marcador ideal.";
    } else {
      message =
        "Você está perto. Faça um ajuste fino no diâmetro para reduzir o borrão calculado.";
    }

    setTextIfChanged(challengeMessage, message);
  }

  function updateRangeProgress(input) {
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    const current = Number(input.value);
    const progress =
      maximum === minimum
        ? 0
        : clamp(((current - minimum) / (maximum - minimum)) * 100, 0, 100);
    input.style.setProperty("--range-progress", progress.toFixed(2) + "%");
  }

  function updateCamera() {
    const simulatorValues = readSimulatorValues();
    if (!simulatorValues) {
      result.setAttribute("aria-busy", "false");
      setTextIfChanged(
        result,
        "Não foi possível calcular a projeção. Restaure os valores do simulador."
      );
      return;
    }

    const opticalState = calculateOpticalState(simulatorValues);
    const {
      apertureMm,
      imageDistanceCm,
      imageDistanceMm,
      objectDistanceCm,
      lightPercent,
      magnification,
      optimalDiameterMm,
      totalBlurMm,
      blurRatio,
      relativeExposure,
      displayedExposure,
      fNumber
    } = opticalState;

    const cssBlur = clamp(0.28 + (blurRatio - 1) * 2.3, 0.28, 6);
    const cssBrightness = 0.06 + displayedExposure * 1.55;
    const cssOpacity = 0.025 + displayedExposure * 0.975;
    const rayStrength = clamp(0.025 + displayedExposure * 0.975, 0.025, 1);
    const screenGlow = clamp(displayedExposure * 0.42, 0.01, 0.42);
    const projectionScale = clamp(
      magnification / REFERENCE_MAGNIFICATION,
      0.42,
      1.8
    );
    const apertureVisualPx = 3 + (apertureMm / 2.5) * 18;

    stage.style.setProperty("--aperture", apertureVisualPx.toFixed(1) + "px");
    stage.style.setProperty("--focus", cssBlur.toFixed(2) + "px");
    stage.style.setProperty("--light", cssBrightness.toFixed(2));
    stage.style.setProperty("--image-opacity", cssOpacity.toFixed(2));
    stage.style.setProperty("--ray-strength", rayStrength.toFixed(2));
    stage.style.setProperty("--screen-glow", screenGlow.toFixed(2));
    stage.style.setProperty("--projection", projectionScale.toFixed(2));

    updateRayGeometry(imageDistanceCm, objectDistanceCm);
    updateComparison(apertureMm, optimalDiameterMm);

    apertureOutput.value = decimal(apertureMm) + " mm";
    distanceOutput.value = imageDistanceCm + " cm";
    objectDistanceOutput.value = objectDistanceCm + " cm";
    lightOutput.value = lightPercent + "%";

    apertureInput.setAttribute("aria-valuetext", apertureOutput.value);
    distanceInput.setAttribute("aria-valuetext", distanceOutput.value);
    objectDistanceInput.setAttribute("aria-valuetext", objectDistanceOutput.value);
    lightInput.setAttribute("aria-valuetext", lightOutput.value);

    [apertureInput, distanceInput, objectDistanceInput, lightInput].forEach(
      updateRangeProgress
    );

    const brightnessDescription =
      relativeExposure < THRESHOLDS.exposureInvisible
        ? "quase invisível"
        : relativeExposure < THRESHOLDS.exposureVisible
          ? "muito escura"
          : relativeExposure < THRESHOLDS.exposureWellLit
            ? "escura"
            : relativeExposure < THRESHOLDS.exposureTooBright
              ? "bem exposta"
              : "muito luminosa";

    const sharpnessDescription =
      blurRatio <= THRESHOLDS.blurBest
        ? "próxima da melhor definição possível"
        : blurRatio <= THRESHOLDS.blurSharp
          ? "nítida"
          : blurRatio <= THRESHOLDS.blurSoft
            ? "suave"
            : "borrada";

    const sizeDescription =
      magnification < THRESHOLDS.magnificationSmall
        ? "pequena"
        : magnification < THRESHOLDS.magnificationLarge
          ? "média"
          : "grande";

    let apertureExplanation;
    if (apertureMm < optimalDiameterMm * THRESHOLDS.apertureSmallFactor) {
      apertureExplanation =
        "O orifício está menor que o ideal: entra pouca luz e a difração passa a espalhar os detalhes.";
    } else if (apertureMm > optimalDiameterMm * THRESHOLDS.apertureLargeFactor) {
      apertureExplanation =
        "O orifício está maior que o ideal: entra mais luz, mas cada ponto forma um círculo geométrico maior.";
    } else {
      apertureExplanation =
        "O orifício está próximo do diâmetro ótimo calculado para estas distâncias.";
    }

    const geometryExplanation =
      "A razão " +
      imageDistanceCm +
      "/" +
      objectDistanceCm +
      " produz ampliação de " +
      decimal(magnification, 3) +
      "×; afastar a tela aumenta a imagem e reduz a irradiância.";

    const lightExplanation =
      lightPercent < THRESHOLDS.lightLowPercent
        ? "A iluminação fraca do objeto limita a visibilidade da projeção."
        : lightPercent < THRESHOLDS.lightStrongPercent
          ? "A iluminação média produz uma projeção útil se a abertura não for muito pequena."
          : "A iluminação forte aumenta a exposição, mas não corrige o desfoque óptico.";

    let verdict = "Configuração fisicamente equilibrada";
    if (relativeExposure < THRESHOLDS.exposureInvisible) {
      verdict = "Projeção quase invisível";
    } else if (blurRatio > THRESHOLDS.blurSoft) {
      verdict = "Projeção visível, mas desfocada";
    } else if (blurRatio <= THRESHOLDS.blurBest) {
      verdict = "Próxima do limite de melhor definição";
    } else if (relativeExposure > THRESHOLDS.exposureTooBright) {
      verdict = "Projeção muito luminosa";
    } else if (relativeExposure < THRESHOLDS.exposureVisible) {
      verdict = "Projeção nítida, porém muito escura";
    }

    const metrics = [
      ["Ampliação", decimal(magnification, 3) + "×"],
      ["Orifício ideal", decimal(optimalDiameterMm, 2) + " mm"],
      ["Borrão calculado", decimal(totalBlurMm, 2) + " mm"],
      ["Exposição relativa", decimal(relativeExposure, 2) + "×"],
      ["Número f", "f/" + Math.round(fNumber)]
    ];
    const metricsMarkup = metrics
      .map(([label, value]) => "<span><b>" + label + "</b>" + value + "</span>")
      .join("");
    const resultMarkup =
      "<strong>" +
      verdict +
      "</strong>" +
      '<span class="result-summary">A imagem fica ' +
      brightnessDescription +
      ", " +
      sharpnessDescription +
      " e " +
      sizeDescription +
      ".</span>" +
      '<span class="result-metrics">' +
      metricsMarkup +
      "</span>" +
      "<small>" +
      apertureExplanation +
      " " +
      geometryExplanation +
      " " +
      lightExplanation +
      "</small>";

    if (result.innerHTML !== resultMarkup) {
      queueResultAnnouncement();
      result.innerHTML = resultMarkup;
    }

    updateChallenge({
      apertureMm,
      optimalDiameterMm,
      relativeExposure,
      blurRatio
    });
  }

  [apertureInput, distanceInput, objectDistanceInput, lightInput].forEach(
    (input) => {
      input.addEventListener("input", () => {
        clearPreset();
        scheduleCameraUpdate();
      });
    }
  );

  presetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const values = getPresetValues(button.dataset.preset);
      if (!values) return;

      activatePreset(button);
      setValues(values);
    });
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      clearPreset();
      resetChallengeView();
      setValues(DEFAULTS);
    });
  }

  if (challengeButton) {
    challengeButton.addEventListener("click", () => {
      clearPreset();
      setPresetAvailability(true);
      challengeActive = true;
      if (challengeProgress) challengeProgress.hidden = false;
      challengeButton.textContent = "Reiniciar desafio";
      challengeButton.setAttribute("aria-expanded", "true");
      setValues(CHALLENGE_START);
      apertureInput.focus();
    });
  }

  updateCamera();
});