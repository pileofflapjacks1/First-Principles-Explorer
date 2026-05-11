export const TRANSISTOR_EXAMPLE = {
  topic: "How does a transistor work",
  breakdown: [
    {
      level: 1,
      title: "Quantum Mechanics & Electron Behavior",
      description: "At the most fundamental level, transistors exploit the quantum mechanical behavior of electrons. Electrons behave as both particles and waves, occupying discrete energy levels within atoms. Their probability of tunneling through barriers or occupying energy bands determines all semiconductor behavior.",
      components: ["Wave-particle duality", "Pauli exclusion principle", "Energy quantization", "Electron spin"],
      wiki_links: [
        { title: "Quantum Mechanics", url: "https://grokipedia.com/page/grokipedia-search?q=quantum+mechanics" },
        { title: "Wave-Particle Duality", url: "https://grokipedia.com/page/grokipedia-search?q=wave+particle+duality" },
        { title: "Quantum Tunneling", url: "https://grokipedia.com/page/grokipedia-search?q=quantum+tunneling" },
      ]
    },
    {
      level: 2,
      title: "Atomic Structure & Bonding",
      description: "Silicon atoms have 4 valence electrons, forming a perfect covalent crystal lattice. Each atom shares electrons with 4 neighbors. This diamond cubic structure creates a rigid, predictable framework that can be precisely engineered with dopant atoms.",
      components: ["Silicon crystal lattice", "Covalent bonds", "Valence electrons", "Band gap energy (1.1 eV)"],
      wiki_links: [
        { title: "Covalent Bonding", url: "https://grokipedia.com/page/grokipedia-search?q=covalent+bonding" },
        { title: "Silicon Crystal Structure", url: "https://grokipedia.com/page/grokipedia-search?q=silicon+crystal+structure" },
        { title: "Valence Electrons", url: "https://grokipedia.com/page/grokipedia-search?q=valence+electrons" },
      ]
    },
    {
      level: 3,
      title: "Semiconductor Energy Bands",
      description: "In silicon, electrons occupy a valence band at low energy. Above it is a forbidden gap (1.1 eV), then the conduction band. At room temperature, thermal energy promotes a small number of electrons across this gap, enabling limited conductivity — far less than metals, far more than insulators.",
      components: ["Valence band", "Conduction band", "Band gap", "Fermi level", "Thermal excitation"],
      wiki_links: [
        { title: "Electronic Band Structure", url: "https://grokipedia.com/page/grokipedia-search?q=electronic+band+structure" },
        { title: "Band Gap", url: "https://grokipedia.com/page/grokipedia-search?q=band+gap+semiconductor" },
        { title: "Fermi Level", url: "https://grokipedia.com/page/grokipedia-search?q=fermi+level" },
      ]
    },
    {
      level: 4,
      title: "Doping: N-type and P-type Silicon",
      description: "Adding trace amounts of phosphorus (5 valence electrons) creates N-type silicon with free electrons. Adding boron (3 valence electrons) creates P-type silicon with 'holes' — positive charge carriers. This controlled impurity changes conductivity by orders of magnitude.",
      components: ["Donor atoms (phosphorus)", "Acceptor atoms (boron)", "Free electrons", "Holes (electron vacancies)", "Carrier concentration"],
      wiki_links: [
        { title: "Semiconductor Doping", url: "https://grokipedia.com/page/grokipedia-search?q=semiconductor+doping" },
        { title: "N-type and P-type Silicon", url: "https://grokipedia.com/page/grokipedia-search?q=n-type+p-type+semiconductor" },
        { title: "Electron Holes", url: "https://grokipedia.com/page/grokipedia-search?q=electron+hole+semiconductor" },
      ]
    },
    {
      level: 5,
      title: "P-N Junction & Depletion Region",
      description: "When P-type and N-type silicon meet, electrons diffuse across and recombine with holes, creating a depletion region with no free carriers. An electric field builds up opposing further diffusion. This junction is the core building block of all semiconductor devices.",
      components: ["Diffusion current", "Drift current", "Depletion width", "Built-in potential (0.7V)", "Space charge region"],
      wiki_links: [
        { title: "P–N Junction", url: "https://grokipedia.com/page/grokipedia-search?q=p-n+junction" },
        { title: "Depletion Region", url: "https://grokipedia.com/page/grokipedia-search?q=depletion+region+semiconductor" },
        { title: "Diode", url: "https://grokipedia.com/page/grokipedia-search?q=diode+semiconductor" },
      ]
    },
    {
      level: 6,
      title: "MOSFET Structure",
      description: "A MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor) has a Source, Drain, and Gate terminal over a thin gate oxide layer on silicon. Applying voltage to the Gate electrode creates an electric field that attracts or repels charge carriers in the channel beneath it.",
      components: ["Source terminal", "Drain terminal", "Gate electrode", "Gate oxide (SiO2)", "Channel region", "Substrate (body)"],
      wiki_links: [
        { title: "MOSFET", url: "https://grokipedia.com/page/grokipedia-search?q=MOSFET+transistor" },
        { title: "Gate Oxide", url: "https://grokipedia.com/page/grokipedia-search?q=gate+oxide+semiconductor" },
        { title: "Field-Effect Transistor", url: "https://grokipedia.com/page/grokipedia-search?q=field+effect+transistor" },
      ]
    },
    {
      level: 7,
      title: "Channel Formation & Switching",
      description: "When gate voltage exceeds the threshold voltage (typically 0.4–0.7V), an inversion layer of electrons forms in the channel between Source and Drain. Current can then flow freely. Below threshold, the channel is depleted and no current flows — the transistor is OFF.",
      components: ["Threshold voltage (Vth)", "Inversion layer", "Channel conductance", "ON/OFF states", "Subthreshold swing"],
      wiki_links: [
        { title: "Threshold Voltage", url: "https://grokipedia.com/page/grokipedia-search?q=threshold+voltage+MOSFET" },
        { title: "Inversion Layer", url: "https://grokipedia.com/page/grokipedia-search?q=inversion+layer+semiconductor" },
        { title: "Subthreshold Conduction", url: "https://grokipedia.com/page/grokipedia-search?q=subthreshold+conduction+transistor" },
      ]
    },
    {
      level: 8,
      title: "Transistor as a Switch/Amplifier",
      description: "By modulating the gate voltage, the transistor either blocks or allows current between Source and Drain. In digital circuits, this binary ON/OFF represents 0 and 1. In analog circuits, the precise relationship between gate voltage and drain current allows amplification of weak signals.",
      components: ["Binary logic (0/1)", "Signal amplification", "Power gain", "Switching speed (GHz)", "Leakage current"],
      wiki_links: [
        { title: "Transistor", url: "https://grokipedia.com/page/grokipedia-search?q=transistor" },
        { title: "Digital Logic", url: "https://grokipedia.com/page/grokipedia-search?q=digital+logic+gates" },
        { title: "Amplifier", url: "https://grokipedia.com/page/grokipedia-search?q=amplifier+transistor" },
      ]
    }
  ],
  mermaid_flowchart: `flowchart LR
    A[Quantum\nMechanics] --> B[Silicon\nCrystal]
    B --> C[Energy\nBands]
    C --> D[Doping\nN/P-type]
    D --> E[P-N\nJunction]
    E --> F[MOSFET\nStructure]
    F --> G[Channel\nSwitching]
    G --> H[Transistor\nOperation]`,
  gap_nodes: ["A", "C", "F", "G", "H"],
  gaps: [
    {
      gap_title: "Sub-1nm Gate Oxide Leakage",
      why_exists: "As gate oxides shrink below 1nm to increase transistor density, quantum tunneling causes unacceptable leakage current, wasting power and generating heat even when transistors are 'off'.",
      innovation_potential: "New high-k dielectric materials like hafnium oxide allow thicker physical layers with the same electrical effect, dramatically reducing leakage. Further innovation needed for 2D material gates.",
      search_query: "companies developing high-k dielectric materials transistor gate oxide 2025",
      public_companies: [
        {
          name: "Applied Materials",
          ticker: "AMAT",
          exchange: "NASDAQ",
          relevance: "World leader in atomic-layer deposition equipment used to deposit high-k gate dielectrics like HfO2 at sub-1nm precision."
        },
        {
          name: "Lam Research",
          ticker: "LRCX",
          exchange: "NASDAQ",
          relevance: "Provides the etch and deposition systems critical for forming ultra-thin gate oxide stacks in advanced logic nodes."
        },
        {
          name: "ASML Holding",
          ticker: "ASML",
          exchange: "NASDAQ",
          relevance: "Sole supplier of EUV lithography machines that define the gate structures requiring sub-1nm dielectric control."
        }
      ]
    },
    {
      gap_title: "3D Transistor Stacking Limits",
      why_exists: "Horizontal scaling has nearly ended — Moore's Law continuation now requires stacking transistors vertically, but heat dissipation from buried layers becomes catastrophic without new cooling architectures.",
      innovation_potential: "Monolithic 3D ICs with buried power rails and microfluidic cooling could enable 100x density gains. Startups developing direct liquid cooling for 3D chiplets are gaining traction.",
      search_query: "companies monolithic 3D IC stacking transistor cooling startup 2025",
      public_companies: [
        {
          name: "Taiwan Semiconductor Manufacturing",
          ticker: "TSM",
          exchange: "NYSE",
          relevance: "Leads 3D chip stacking with SoIC and CoWoS packaging technologies used in AI accelerators and advanced logic."
        },
        {
          name: "SK Hynix",
          ticker: "000660",
          exchange: "KRX",
          relevance: "Pioneers High Bandwidth Memory (HBM) stacking that connects memory dies vertically via through-silicon vias."
        },
        {
          name: "Advanced Micro Devices",
          ticker: "AMD",
          exchange: "NASDAQ",
          relevance: "Commercialized chiplet architecture with 3D V-Cache stacking, doubling L3 cache density for CPUs and GPUs."
        }
      ]
    },
    {
      gap_title: "2D Material Transistors Beyond Silicon",
      why_exists: "Silicon's band gap and carrier mobility are approaching fundamental limits at atomic scales. 2D materials like MoS2 and graphene have superior properties but are nearly impossible to manufacture reliably at scale.",
      innovation_potential: "A manufacturable 2D channel material could extend transistor scaling by a decade. Companies achieving wafer-scale deposition of defect-free 2D materials will unlock atomic-scale switching.",
      search_query: "companies developing 2D transistor materials MoS2 graphene semiconductor 2025",
      public_companies: [
        {
          name: "Applied Materials",
          ticker: "AMAT",
          exchange: "NASDAQ",
          relevance: "Developing CVD and ALD tools capable of depositing monolayer MoS2 and other TMDs at wafer scale."
        },
        {
          name: "Tokyo Electron",
          ticker: "TOELY",
          exchange: "OTCMKTS",
          relevance: "Leading Japanese equipment maker advancing thin-film deposition systems adaptable to 2D material growth."
        },
        {
          name: "Intel",
          ticker: "INTC",
          exchange: "NASDAQ",
          relevance: "Actively researching 2D channel transistors (RibbonFETs) and has published roadmaps incorporating 2D materials post-2nm."
        }
      ]
    },
    {
      gap_title: "Neuromorphic & Analog Compute",
      why_exists: "Digital binary switching wastes enormous energy on operations that biological neurons perform with milliwatts. Transistors operating in the analog domain for AI inference remain difficult to program and manufacture reliably.",
      innovation_potential: "Analog in-memory computing using memristors or phase-change materials could enable 1000x energy efficiency for AI workloads, eliminating the von Neumann bottleneck entirely.",
      search_query: "companies neuromorphic analog compute memristor in-memory computing startup 2025",
      public_companies: [
        {
          name: "Intel",
          ticker: "INTC",
          exchange: "NASDAQ",
          relevance: "Developed Loihi 2, a research neuromorphic chip with 1 million neurons, used for adaptive AI at the edge."
        },
        {
          name: "International Business Machines",
          ticker: "IBM",
          exchange: "NYSE",
          relevance: "Pioneering phase-change memory and analog AI chips that perform matrix multiplication in the memory array itself."
        },
        {
          name: "Qualcomm",
          ticker: "QCOM",
          exchange: "NASDAQ",
          relevance: "Shipping on-device AI inference chips (Hexagon NPU) that bring analog-inspired computing to billions of handsets."
        }
      ]
    },
    {
      gap_title: "Spin-Based Transistors (Spintronics)",
      why_exists: "Conventional transistors control charge flow, but electron spin is an untapped degree of freedom. Spin-based logic could operate at room temperature with near-zero switching energy, but spin coherence remains too short for practical circuits.",
      innovation_potential: "If spin coherence can be maintained across thousands of gate operations at room temperature, spintronic logic would enable non-volatile, ultra-low-power computing that retains state without power.",
      search_query: "companies spintronics spin transistor room temperature non-volatile computing 2025",
      public_companies: [
        {
          name: "Western Digital",
          ticker: "WDC",
          exchange: "NASDAQ",
          relevance: "Already deploys spintronic read heads (TMR sensors) in HDDs and is researching spin-torque MRAM for storage."
        },
        {
          name: "Seagate Technology",
          ticker: "STX",
          exchange: "NASDAQ",
          relevance: "Uses giant magnetoresistance (GMR) in all its drives and funds research into spin-orbit torque switching devices."
        },
        {
          name: "Everspin Technologies",
          ticker: "MRAM",
          exchange: "NASDAQ",
          relevance: "Only pure-play public company shipping MRAM (spin-torque magnetic memory) — the first commercial spintronic compute memory."
        }
      ]
    }
  ]
};
