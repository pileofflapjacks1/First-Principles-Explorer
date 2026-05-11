export const TRANSISTOR_EXAMPLE = {
  topic: "How does a transistor work",
  breakdown: [
    {
      level: 1,
      title: "Quantum Mechanics & Electron Behavior",
      description: "At the most fundamental level, transistors exploit the quantum mechanical behavior of electrons. Electrons behave as both particles and waves, occupying discrete energy levels within atoms. Their probability of tunneling through barriers or occupying energy bands determines all semiconductor behavior.",
      components: ["Wave-particle duality", "Pauli exclusion principle", "Energy quantization", "Electron spin"]
    },
    {
      level: 2,
      title: "Atomic Structure & Bonding",
      description: "Silicon atoms have 4 valence electrons, forming a perfect covalent crystal lattice. Each atom shares electrons with 4 neighbors. This diamond cubic structure creates a rigid, predictable framework that can be precisely engineered with dopant atoms.",
      components: ["Silicon crystal lattice", "Covalent bonds", "Valence electrons", "Band gap energy (1.1 eV)"]
    },
    {
      level: 3,
      title: "Semiconductor Energy Bands",
      description: "In silicon, electrons occupy a valence band at low energy. Above it is a forbidden gap (1.1 eV), then the conduction band. At room temperature, thermal energy promotes a small number of electrons across this gap, enabling limited conductivity — far less than metals, far more than insulators.",
      components: ["Valence band", "Conduction band", "Band gap", "Fermi level", "Thermal excitation"]
    },
    {
      level: 4,
      title: "Doping: N-type and P-type Silicon",
      description: "Adding trace amounts of phosphorus (5 valence electrons) creates N-type silicon with free electrons. Adding boron (3 valence electrons) creates P-type silicon with 'holes' — positive charge carriers. This controlled impurity changes conductivity by orders of magnitude.",
      components: ["Donor atoms (phosphorus)", "Acceptor atoms (boron)", "Free electrons", "Holes (electron vacancies)", "Carrier concentration"]
    },
    {
      level: 5,
      title: "P-N Junction & Depletion Region",
      description: "When P-type and N-type silicon meet, electrons diffuse across and recombine with holes, creating a depletion region with no free carriers. An electric field builds up opposing further diffusion. This junction is the core building block of all semiconductor devices.",
      components: ["Diffusion current", "Drift current", "Depletion width", "Built-in potential (0.7V)", "Space charge region"]
    },
    {
      level: 6,
      title: "MOSFET Structure",
      description: "A MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor) has a Source, Drain, and Gate terminal over a thin gate oxide layer on silicon. Applying voltage to the Gate electrode creates an electric field that attracts or repels charge carriers in the channel beneath it.",
      components: ["Source terminal", "Drain terminal", "Gate electrode", "Gate oxide (SiO2)", "Channel region", "Substrate (body)"]
    },
    {
      level: 7,
      title: "Channel Formation & Switching",
      description: "When gate voltage exceeds the threshold voltage (typically 0.4–0.7V), an inversion layer of electrons forms in the channel between Source and Drain. Current can then flow freely. Below threshold, the channel is depleted and no current flows — the transistor is OFF.",
      components: ["Threshold voltage (Vth)", "Inversion layer", "Channel conductance", "ON/OFF states", "Subthreshold swing"]
    },
    {
      level: 8,
      title: "Transistor as a Switch/Amplifier",
      description: "By modulating the gate voltage, the transistor either blocks or allows current between Source and Drain. In digital circuits, this binary ON/OFF represents 0 and 1. In analog circuits, the precise relationship between gate voltage and drain current allows amplification of weak signals.",
      components: ["Binary logic (0/1)", "Signal amplification", "Power gain", "Switching speed (GHz)", "Leakage current"]
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
  gaps: [
    {
      gap_title: "Sub-1nm Gate Oxide Leakage",
      why_exists: "As gate oxides shrink below 1nm to increase transistor density, quantum tunneling causes unacceptable leakage current, wasting power and generating heat even when transistors are 'off'.",
      innovation_potential: "New high-k dielectric materials like hafnium oxide allow thicker physical layers with the same electrical effect, dramatically reducing leakage. Further innovation needed for 2D material gates.",
      search_query: "companies developing high-k dielectric materials transistor gate oxide 2025"
    },
    {
      gap_title: "3D Transistor Stacking Limits",
      why_exists: "Horizontal scaling has nearly ended — Moore's Law continuation now requires stacking transistors vertically, but heat dissipation from buried layers becomes catastrophic without new cooling architectures.",
      innovation_potential: "Monolithic 3D ICs with buried power rails and microfluidic cooling could enable 100x density gains. Startups developing direct liquid cooling for 3D chiplets are gaining traction.",
      search_query: "companies monolithic 3D IC stacking transistor cooling startup 2025"
    },
    {
      gap_title: "2D Material Transistors Beyond Silicon",
      why_exists: "Silicon's band gap and carrier mobility are approaching fundamental limits at atomic scales. 2D materials like MoS2 and graphene have superior properties but are nearly impossible to manufacture reliably at scale.",
      innovation_potential: "A manufacturable 2D channel material could extend transistor scaling by a decade. Companies achieving wafer-scale deposition of defect-free 2D materials will unlock atomic-scale switching.",
      search_query: "companies developing 2D transistor materials MoS2 graphene semiconductor 2025"
    },
    {
      gap_title: "Neuromorphic & Analog Compute",
      why_exists: "Digital binary switching wastes enormous energy on operations that biological neurons perform with milliwatts. Transistors operating in the analog domain for AI inference remain difficult to program and manufacture reliably.",
      innovation_potential: "Analog in-memory computing using memristors or phase-change materials could enable 1000x energy efficiency for AI workloads, eliminating the von Neumann bottleneck entirely.",
      search_query: "companies neuromorphic analog compute memristor in-memory computing startup 2025"
    },
    {
      gap_title: "Spin-Based Transistors (Spintronics)",
      why_exists: "Conventional transistors control charge flow, but electron spin is an untapped degree of freedom. Spin-based logic could operate at room temperature with near-zero switching energy, but spin coherence remains too short for practical circuits.",
      innovation_potential: "If spin coherence can be maintained across thousands of gate operations at room temperature, spintronic logic would enable non-volatile, ultra-low-power computing that retains state without power.",
      search_query: "companies spintronics spin transistor room temperature non-volatile computing 2025"
    }
  ]
};
