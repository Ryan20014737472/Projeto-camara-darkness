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
  const lightInput = document.querySelector("#light-control");
  const apertureOutput = document.querySelector("#aperture-value");
  const distanceOutput = document.querySelector("#distance-value");
  const lightOutput = document.querySelector("#light-value");
  const sharpnessText = document.querySelector("#sharpness-text");

  if (!stage || !apertureInput || !distanceInput || !lightInput) return;

  function updateCamera() {
    const aperture = Number(apertureInput.value);
    const distance = Number(distanceInput.value);
    const light = Number(lightInput.value);

    const apertureLevel = (aperture - 3) / 17;
    const distanceLevel = (distance - 6) / 18;
    const lightLevel = light / 100;

    // Aberturas maiores e telas mais distantes aumentam o círculo de confusão.
    const blur = 0.2 + apertureLevel * 4 + distanceLevel * 1.15;

    // A iluminação percebida considera a fonte, a abertura e a perda com a distância.
    const distanceLight = 1 - distanceLevel * 0.58;
    const effectiveExposure = lightLevel * (0.18 + apertureLevel * 0.82) * distanceLight;
    const brightness = 0.08 + effectiveExposure * 1.72;
    const imageOpacity = Math.min(1, 0.07 + effectiveExposure * 1.65);
    const rayStrength = Math.min(1, 0.04 + lightLevel * (0.35 + apertureLevel * 0.65));
    const screenGlow = Math.min(0.45, 0.01 + effectiveExposure * 0.5);
    const projection = 0.72 + distance * 0.018;

    stage.style.setProperty("--aperture", `${aperture}px`);
    stage.style.setProperty("--focus", `${blur.toFixed(2)}px`);
    stage.style.setProperty("--light", brightness.toFixed(2));
    stage.style.setProperty("--image-opacity", imageOpacity.toFixed(2));
    stage.style.setProperty("--ray-strength", rayStrength.toFixed(2));
    stage.style.setProperty("--screen-glow", screenGlow.toFixed(2));
    stage.style.setProperty("--projection", projection.toFixed(2));

    apertureOutput.value = `${aperture} mm`;
    distanceOutput.value = `${distance} cm`;
    lightOutput.value = `${light}%`;

    const brightnessDescription =
      effectiveExposure < 0.12 ? "muito escura" :
      effectiveExposure < 0.28 ? "escura" :
      effectiveExposure < 0.58 ? "bem iluminada" : "muito iluminada";

    const sharpnessDescription =
      blur < 1.35 ? "bem nítida" :
      blur < 2.7 ? "moderadamente nítida" :
      blur < 4 ? "pouco nítida" : "borrada";

    const sizeDescription =
      distance <= 10 ? "pequena" :
      distance <= 17 ? "de tamanho médio" : "ampliada";

    const apertureDescription =
      aperture <= 7
        ? "A abertura pequena limita a entrada de luz, mas melhora a definição."
        : aperture <= 13
          ? "A abertura média equilibra luminosidade e definição."
          : "A abertura grande deixa entrar mais luz, porém sobrepõe mais raios e desfoca a imagem.";

    const distanceDescription =
      distance <= 10
        ? "A tela próxima recebe uma projeção menor, mais concentrada e luminosa."
        : distance <= 17
          ? "A distância intermediária produz uma ampliação moderada com perda controlada de luz."
          : "A tela distante amplia a projeção, mas espalha a luz por uma área maior e aumenta o desfoque.";

    const lightDescription =
      light < 35
        ? "A fonte fraca reduz bastante a visibilidade."
        : light < 70
          ? "A fonte média fornece iluminação suficiente quando a abertura permite."
          : "A fonte intensa aumenta a visibilidade sem alterar diretamente a nitidez.";

    let verdict = "Configuração equilibrada";
    if (effectiveExposure < 0.12) verdict = "Projeção quase invisível";
    else if (blur >= 4) verdict = "Projeção clara, mas muito desfocada";
    else if (effectiveExposure < 0.28) verdict = "Projeção visível, porém escura";
    else if (blur < 1.35) verdict = "Projeção nítida";
    else if (effectiveExposure >= 0.58) verdict = "Projeção forte e luminosa";

    sharpnessText.innerHTML =
      `<strong>${verdict}</strong>` +
      `<span class="result-summary">A imagem fica ${brightnessDescription}, ${sharpnessDescription} e ${sizeDescription}.</span>` +
      `<small>${apertureDescription} ${distanceDescription} ${lightDescription}</small>`;
  }

  [apertureInput, distanceInput, lightInput].forEach((input) => input.addEventListener("input", updateCamera));
  updateCamera();
});