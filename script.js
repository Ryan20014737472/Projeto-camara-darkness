document.addEventListener("DOMContentLoaded", () => {
  const revealItems = document.querySelectorAll(".reveal");
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

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

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

  const WAVELENGTH_MM = 0.00055;
  const REFERENCE_APERTURE_MM = 0.5;
  const REFERENCE_IMAGE_DISTANCE_MM = 140;
  const REFERENCE_OBJECT_DISTANCE_MM = 2000;
  const REFERENCE_LIGHT = 0.7;
  const DEFAULTS = {
    aperture: 0.6,
    imageDistance: 12,
    objectDistance: 200,
    light: 70
  };

  let challengeActive = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const decimal = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

  function calculateOptimalDiameter(imageDistanceCm, objectDistanceCm) {
    const imageDistanceMm = imageDistanceCm * 10;
    const objectDistanceMm = objectDistanceCm * 10;
    return Math.sqrt(
      (2 * WAVELENGTH_MM * objectDistanceMm * imageDistanceMm) /
      (objectDistanceMm + imageDistanceMm)
    );
  }

  function clearPreset() {
    presetButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function activatePreset(activeButton) {
    clearPreset();
    activeButton.setAttribute("aria-pressed", "true");
  }

  function setValues(values) {
    if (values.aperture !== undefined) apertureInput.value = String(values.aperture);
    if (values.imageDistance !== undefined) distanceInput.value = String(values.imageDistance);
    if (values.objectDistance !== undefined) objectDistanceInput.value = String(values.objectDistance);
    if (values.light !== undefined) lightInput.value = String(values.light);
    updateCamera();
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
    if (chosenAperture) chosenAperture.textContent = decimal(apertureMm, 2) + " mm";
    if (idealAperture) idealAperture.textContent = decimal(optimalDiameterMm, 2) + " mm";

    const min = Number(apertureInput.min);
    const max = Number(apertureInput.max);
    const chosenPosition = clamp(((apertureMm - min) / (max - min)) * 100, 0, 100);
    const idealPosition = clamp(((optimalDiameterMm - min) / (max - min)) * 100, 0, 100);
    if (chosenMarker) chosenMarker.style.left = chosenPosition.toFixed(2) + "%";
    if (idealMarker) idealMarker.style.left = idealPosition.toFixed(2) + "%";

    if (!differenceText) return;
    const signedDifference = (apertureMm - optimalDiameterMm) / optimalDiameterMm;
    const differencePercent = Math.abs(signedDifference) * 100;

    if (differencePercent <= 12) {
      differenceText.textContent =
        "O valor escolhido está na faixa ideal para estas distâncias.";
    } else if (signedDifference < 0) {
      differenceText.textContent =
        Math.round(differencePercent) +
        "% menor que o ideal: a difração tende a dominar.";
    } else {
      differenceText.textContent =
        Math.round(differencePercent) +
        "% maior que o ideal: o borrão geométrico tende a dominar.";
    }
  }

  function markChallengeItem(item, complete) {
    if (item) item.classList.toggle("done", complete);
  }

  function resetChallengeView() {
    challengeActive = false;
    if (challengeProgress) {
      challengeProgress.hidden = true;
      challengeProgress.classList.remove("complete");
    }
    [challengeLight, challengeAperture, challengeSharpness].forEach((item) => {
      if (item) item.classList.remove("done");
    });
    if (challengeButton) challengeButton.textContent = "Iniciar desafio";
  }

  function updateChallenge(state) {
    if (!challengeActive || !challengeProgress) return;

    const visible = state.relativeExposure >= 0.3;
    const nearIdeal =
      Math.abs(state.apertureMm - state.optimalDiameterMm) /
        state.optimalDiameterMm <=
      0.15;
    const sharp = state.blurRatio <= 1.25;

    markChallengeItem(challengeLight, visible);
    markChallengeItem(challengeAperture, nearIdeal);
    markChallengeItem(challengeSharpness, sharp);

    const complete = visible && nearIdeal && sharp;
    challengeProgress.classList.toggle("complete", complete);

    if (!challengeMessage) return;
    if (complete) {
      challengeMessage.textContent =
        "Desafio concluído: a projeção está visível e próxima da melhor definição calculada.";
    } else if (!visible) {
      challengeMessage.textContent =
        "A projeção ainda está escura. Aumente a iluminação ou abra um pouco o orifício.";
    } else if (!nearIdeal) {
      challengeMessage.textContent =
        state.apertureMm < state.optimalDiameterMm
          ? "O orifício está pequeno demais. Aumente-o em direção ao marcador ideal."
          : "O orifício está grande demais. Reduza-o em direção ao marcador ideal.";
    } else {
      challengeMessage.textContent =
        "Você está perto. Faça um ajuste fino no diâmetro para reduzir o borrão calculado.";
    }
  }

  function updateCamera() {
    const apertureMm = Number(apertureInput.value);
    const imageDistanceCm = Number(distanceInput.value);
    const objectDistanceCm = Number(objectDistanceInput.value);
    const lightPercent = Number(lightInput.value);

    const imageDistanceMm = imageDistanceCm * 10;
    const objectDistanceMm = objectDistanceCm * 10;
    const lightLevel = lightPercent / 100;
    const magnification = imageDistanceMm / objectDistanceMm;
    const optimalDiameterMm = calculateOptimalDiameter(
      imageDistanceCm,
      objectDistanceCm
    );

    const geometricBlurMm = apertureMm * (1 + magnification);
    const diffractionBlurMm = (2.44 * WAVELENGTH_MM * imageDistanceMm) / apertureMm;
    const totalBlurMm = Math.hypot(geometricBlurMm, diffractionBlurMm);

    const optimalGeometricBlurMm = optimalDiameterMm * (1 + magnification);
    const optimalDiffractionBlurMm =
      (2.44 * WAVELENGTH_MM * imageDistanceMm) / optimalDiameterMm;
    const minimumBlurMm = Math.hypot(
      optimalGeometricBlurMm,
      optimalDiffractionBlurMm
    );
    const blurRatio = totalBlurMm / minimumBlurMm;

    const referenceFiniteFactor = Math.pow(
      REFERENCE_OBJECT_DISTANCE_MM /
        (REFERENCE_OBJECT_DISTANCE_MM + REFERENCE_IMAGE_DISTANCE_MM),
      2
    );
    const finiteDistanceFactor = Math.pow(
      objectDistanceMm / (objectDistanceMm + imageDistanceMm),
      2
    );
    const relativeExposure =
      (lightLevel / REFERENCE_LIGHT) *
      Math.pow(apertureMm / REFERENCE_APERTURE_MM, 2) *
      Math.pow(REFERENCE_IMAGE_DISTANCE_MM / imageDistanceMm, 2) *
      (finiteDistanceFactor / referenceFiniteFactor);

    const displayedExposure = 1 - Math.exp(-0.85 * relativeExposure);
    const cssBlur = clamp(0.28 + (blurRatio - 1) * 2.3, 0.28, 6);
    const cssBrightness = 0.06 + displayedExposure * 1.55;
    const cssOpacity = 0.025 + displayedExposure * 0.975;
    const rayStrength = clamp(0.025 + displayedExposure * 0.975, 0.025, 1);
    const screenGlow = clamp(displayedExposure * 0.42, 0.01, 0.42);
    const referenceMagnification =
      REFERENCE_IMAGE_DISTANCE_MM / REFERENCE_OBJECT_DISTANCE_MM;
    const projectionScale = clamp(
      magnification / referenceMagnification,
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

    const brightnessDescription =
      relativeExposure < 0.08
        ? "quase invisível"
        : relativeExposure < 0.3
          ? "muito escura"
          : relativeExposure < 0.75
            ? "escura"
            : relativeExposure < 2.5
              ? "bem exposta"
              : "muito luminosa";

    const sharpnessDescription =
      blurRatio <= 1.12
        ? "próxima da melhor definição possível"
        : blurRatio <= 1.45
          ? "nítida"
          : blurRatio <= 2.3
            ? "suave"
            : "borrada";

    const sizeDescription =
      magnification < 0.04
        ? "pequena"
        : magnification < 0.12
          ? "média"
          : "grande";

    let apertureExplanation;
    if (apertureMm < optimalDiameterMm * 0.78) {
      apertureExplanation =
        "O orifício está menor que o ideal: entra pouca luz e a difração passa a espalhar os detalhes.";
    } else if (apertureMm > optimalDiameterMm * 1.32) {
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
      magnification.toFixed(3) +
      "×; afastar a tela aumenta a imagem e reduz a irradiância.";

    const lightExplanation =
      lightPercent < 35
        ? "A iluminação fraca do objeto limita a visibilidade da projeção."
        : lightPercent < 70
          ? "A iluminação média produz uma projeção útil se a abertura não for muito pequena."
          : "A iluminação forte aumenta a exposição, mas não corrige o desfoque óptico.";

    let verdict = "Configuração fisicamente equilibrada";
    if (relativeExposure < 0.08) verdict = "Projeção quase invisível";
    else if (blurRatio > 2.3) verdict = "Projeção visível, mas desfocada";
    else if (blurRatio <= 1.12) verdict = "Próxima do limite de melhor definição";
    else if (relativeExposure > 2.5) verdict = "Projeção muito luminosa";
    else if (relativeExposure < 0.3) verdict = "Projeção nítida, porém muito escura";

    const fNumber = imageDistanceMm / apertureMm;

    result.innerHTML =
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
        "<span><b>Ampliação</b>" + magnification.toFixed(3) + "×</span>" +
        "<span><b>Orifício ideal</b>" + decimal(optimalDiameterMm, 2) + " mm</span>" +
        "<span><b>Borrão calculado</b>" + decimal(totalBlurMm, 2) + " mm</span>" +
        "<span><b>Exposição relativa</b>" + decimal(relativeExposure, 2) + "×</span>" +
        "<span><b>Número f</b>f/" + Math.round(fNumber) + "</span>" +
      "</span>" +
      "<small>" +
      apertureExplanation +
      " " +
      geometryExplanation +
      " " +
      lightExplanation +
      "</small>";

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
        updateCamera();
      });
    }
  );

  presetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      activatePreset(button);

      if (preset === "ideal") {
        const ideal = calculateOptimalDiameter(
          Number(distanceInput.value),
          Number(objectDistanceInput.value)
        );
        setValues({
          aperture: clamp(Math.round(ideal * 10) / 10, 0.1, 2.5),
          light: 70
        });
      } else if (preset === "diffraction") {
        setValues({
          aperture: 0.1,
          imageDistance: 40,
          objectDistance: 200,
          light: 100
        });
      } else if (preset === "blur") {
        setValues({
          aperture: 2.5,
          imageDistance: 40,
          objectDistance: 80,
          light: 100
        });
      }
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
      challengeActive = true;
      if (challengeProgress) challengeProgress.hidden = false;
      challengeButton.textContent = "Reiniciar desafio";
      setValues({
        aperture: 0.2,
        imageDistance: 33,
        objectDistance: 200,
        light: 30
      });
    });
  }

  updateCamera();
});