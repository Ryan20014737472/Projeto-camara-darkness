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

    const sharpness = Math.max(0.4, 4.5 - aperture * 0.32 + distance * 0.03);
    const brightness = Math.min(1.55, 0.25 + aperture * 0.07 + light * 0.008);
    const projection = 0.72 + distance * 0.018;

    stage.style.setProperty("--aperture", `${aperture}px`);
    stage.style.setProperty("--focus", `${sharpness.toFixed(2)}px`);
    stage.style.setProperty("--light", brightness.toFixed(2));
    stage.style.setProperty("--projection", projection.toFixed(2));

    apertureOutput.value = `${aperture} mm`;
    distanceOutput.value = `${distance} cm`;
    lightOutput.value = `${light}%`;

    if (aperture <= 7) {
      sharpnessText.innerHTML = "<strong>Imagem nítida, porém escura.</strong> O orifício pequeno deixa passar poucos raios de luz.";
    } else if (aperture >= 15) {
      sharpnessText.innerHTML = "<strong>Imagem clara, porém borrada.</strong> A abertura grande permite a entrada de muitos raios.";
    } else {
      sharpnessText.innerHTML = "<strong>Bom equilíbrio.</strong> A câmera recebe luz suficiente mantendo os contornos reconhecíveis.";
    }
  }

  [apertureInput, distanceInput, lightInput].forEach((input) => input.addEventListener("input", updateCamera));
  updateCamera();
});