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

  if (!stage || !apertureInput || !distanceInput || !objectDistanceInput || !lightInput || !result) return;

  const WAVELENGTH_MM = 0.00055;
  const REFERENCE_APERTURE_MM = 0.5;
  const REFERENCE_IMAGE_DISTANCE_MM = 140;
  const REFERENCE_OBJECT_DISTANCE_MM = 2000;
  const REFERENCE_LIGHT = 0.7;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const decimal = (value, digits = 1) => value.toFixed(digits).replace(".", ",");

  function updateCamera() {
    const apertureMm = Number(apertureInput.value);
    const imageDistanceCm = Number(distanceInput.value);
    const objectDistanceCm = Number(objectDistanceInput.value);
    const lightPercent = Number(lightInput.value);

    const imageDistanceMm = imageDistanceCm * 10;
    const objectDistanceMm = objectDistanceCm * 10;
    const lightLevel = lightPercent / 100;

    // Semelhança de triângulos: a imagem é invertida e m = distância da tela / distância do objeto.
    const magnification = imageDistanceMm / objectDistanceMm;

    // Limite de difração para imagem sem lente (critério de quarto de onda, NIST).
    const optimalDiameterMm = Math.sqrt(
      (2 * WAVELENGTH_MM * objectDistanceMm * imageDistanceMm) /
      (objectDistanceMm + imageDistanceMm)
    );

    // Aproximação didática do ponto-imagem: borrão geométrico + disco de Airy.
    const geometricBlurMm = apertureMm * (1 + magnification);
    const diffractionBlurMm = (2.44 * WAVELENGTH_MM * imageDistanceMm) / apertureMm;
    const totalBlurMm = Math.hypot(geometricBlurMm, diffractionBlurMm);

    const optimalGeometricBlurMm = optimalDiameterMm * (1 + magnification);
    const optimalDiffractionBlurMm =
      (2.44 * WAVELENGTH_MM * imageDistanceMm) / optimalDiameterMm;
    const minimumBlurMm = Math.hypot(optimalGeometricBlurMm, optimalDiffractionBlurMm);
    const blurRatio = totalBlurMm / minimumBlurMm;

    // Exposição relativa: área do orifício, lei do inverso do quadrado e geometria finita.
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

    // Compressão tonal apenas para representar no monitor uma faixa luminosa muito ampla.
    const displayedExposure = 1 - Math.exp(-0.85 * relativeExposure);
    const cssBlur = clamp(0.28 + (blurRatio - 1) * 2.3, 0.28, 6);
    const cssBrightness = 0.06 + displayedExposure * 1.55;
    const cssOpacity = 0.025 + displayedExposure * 0.975;
    const rayStrength = clamp(0.025 + displayedExposure * 0.975, 0.025, 1);
    const screenGlow = clamp(displayedExposure * 0.42, 0.01, 0.42);
    const referenceMagnification =
      REFERENCE_IMAGE_DISTANCE_MM / REFERENCE_OBJECT_DISTANCE_MM;
    const projectionScale = clamp(magnification / referenceMagnification, 0.42, 1.8);
    const apertureVisualPx = 3 + (apertureMm / 2.5) * 18;

    stage.style.setProperty("--aperture", `${apertureVisualPx.toFixed(1)}px`);
    stage.style.setProperty("--focus", `${cssBlur.toFixed(2)}px`);
    stage.style.setProperty("--light", cssBrightness.toFixed(2));
    stage.style.setProperty("--image-opacity", cssOpacity.toFixed(2));
    stage.style.setProperty("--ray-strength", rayStrength.toFixed(2));
    stage.style.setProperty("--screen-glow", screenGlow.toFixed(2));
    stage.style.setProperty("--projection", projectionScale.toFixed(2));

    apertureOutput.value = `${decimal(apertureMm)} mm`;
    distanceOutput.value = `${imageDistanceCm} cm`;
    objectDistanceOutput.value = `${objectDistanceCm} cm`;
    lightOutput.value = `${lightPercent}%`;

    const brightnessDescription =
      relativeExposure < 0.08 ? "quase invisível" :
      relativeExposure < 0.3 ? "muito escura" :
      relativeExposure < 0.75 ? "escura" :
      relativeExposure < 2.5 ? "bem exposta" : "muito luminosa";

    const sharpnessDescription =
      blurRatio <= 1.12 ? "próxima da melhor definição possível" :
      blurRatio <= 1.45 ? "nítida" :
      blurRatio <= 2.3 ? "suave" : "borrada";

    const sizeDescription =
      magnification < 0.04 ? "pequena" :
      magnification < 0.12 ? "média" : "grande";

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
      `A razão ${imageDistanceCm}/${objectDistanceCm} produz ampliação de ${magnification.toFixed(3)}×; afastar a tela aumenta a imagem e reduz a irradiância.`;

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
      `<strong>${verdict}</strong>` +
      `<span class="result-summary">A imagem fica ${brightnessDescription}, ${sharpnessDescription} e ${sizeDescription}.</span>` +
      `<span class="result-metrics">` +
        `<span><b>Ampliação</b>${magnification.toFixed(3)}×</span>` +
        `<span><b>Orifício ideal</b>${decimal(optimalDiameterMm, 2)} mm</span>` +
        `<span><b>Borrão calculado</b>${decimal(totalBlurMm, 2)} mm</span>` +
        `<span><b>Exposição relativa</b>${decimal(relativeExposure, 2)}×</span>` +
        `<span><b>Número f</b>f/${Math.round(fNumber)}</span>` +
      `</span>` +
      `<small>${apertureExplanation} ${geometryExplanation} ${lightExplanation}</small>`;
  }

  [apertureInput, distanceInput, objectDistanceInput, lightInput].forEach((input) =>
    input.addEventListener("input", updateCamera)
  );
  updateCamera();
});