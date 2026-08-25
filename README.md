# Câmara Escura — Projeto Integrador

Site educacional desenvolvido para apresentar o conceito de câmara escura por meio de fundamentação teórica, simulação óptica interativa e experimento real.

Projeto da turma **2M** do **Colégio Estadual do Paraná**.

## Conteúdo do site

- contextualização, problema investigado, hipótese e objetivos;
- conceito e fundamentação sobre propagação retilínea da luz;
- simulador com diâmetro do orifício, distâncias e iluminação ajustáveis;
- configurações prontas para orifício ideal, difração e desfoque geométrico;
- desenho dinâmico dos raios luminosos;
- comparação entre o orifício escolhido e o valor ideal;
- desafio guiado para encontrar uma imagem visível e definida;
- metodologia de construção da câmara real;
- resultados, limitações e conclusão do experimento.

## Modelo físico do simulador

O simulador combina óptica geométrica e óptica ondulatória.

- **Ampliação:** `m = v / u`
- **Diâmetro ótimo:** `d = √[2λuv / (u + v)]`
- **Difração:** `B = 2,44λv / d`
- **Exposição relativa:** varia com a iluminação, a área do orifício e a distância da tela.

O modelo utiliza comprimento de onda de **550 nm**, próximo do verde-amarelo. A representação visual comprime a faixa de brilho para ser exibida no monitor.

## Experimento real

| Medida | Valor |
| --- | --- |
| Caixa utilizada | Caixa de tênis Puma |
| Comprimento | 33 cm |
| Largura | 19 cm |
| Altura | 11,5 cm |
| Diâmetro do orifício | 0,6 mm |
| Distância orifício → tela | 12 cm |
| Tela | Papel-manteiga, aproximadamente 19 × 11,5 cm |

O experimento demonstra a propagação retilínea da luz e a formação de uma imagem invertida na tela.

## Estrutura do projeto

```text
.
├── index.html
├── style.css
├── script.js
├── README.md
└── assets
    ├── colegio.jpg
    ├── esquema-camara.jpg
    ├── favicon.svg
    └── compartilhamento.png
```

## Como executar

O projeto utiliza apenas HTML, CSS e JavaScript, sem etapa de compilação.

1. Baixe ou clone o repositório.
2. Abra `index.html` em um navegador moderno.

Para evitar restrições locais do navegador, também é possível servir a pasta com qualquer servidor HTTP estático.

## Acessibilidade

O site inclui:

- link para pular diretamente ao conteúdo;
- navegação por teclado com foco visível;
- foco transferido para a seção selecionada no menu;
- indicação da seção atual com `aria-current`;
- descrições para imagens e para a simulação;
- valores acessíveis nos controles deslizantes;
- suporte a `prefers-reduced-motion`;
- botões com tamanho adequado para telas sensíveis ao toque;
- layout responsivo para celulares.

## Integrantes

- Ryan Batistel
- Raphaela Rodrigues
- Davi Amaral
- Noan Farias
- Leandro Puly

## Referências científicas

- Mielenz, K. D. [On the Diffraction Limit for Lensless Imaging](https://nvlpubs.nist.gov/nistpubs/jres/104/5/j45mie.pdf). *Journal of Research of NIST*, 1999.
- Rayleigh, Lord. [On Pin-hole Photography](https://doi.org/10.1080/14786449108620080). *Philosophical Magazine*, 1891.

---

Projeto Integrador • 2026
