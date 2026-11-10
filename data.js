/* Default data for NEET Saathi. Everything here is editable inside the app. */
window.NS_DATA = {
  subjects: {
    P: { name: 'Physics', short: 'Phy', q: 45, max: 180 },
    C: { name: 'Chemistry', short: 'Chem', q: 45, max: 180 },
    B: { name: 'Biology', short: 'Bio', q: 90, max: 360 }
  },
  stages: ['Lec', 'NCERT', 'DPP', 'PYQ', 'R1', 'R2'],
  stageNames: ['Lecture', 'NCERT', 'DPP', 'PYQ', 'Revision 1', 'Revision 2'],
  // [class, chapter]. Check the official NTA syllabus and edit in Track > Syllabus > Edit.
  chapters: {
    P: [
      [11, 'Units and Measurements'], [11, 'Motion in a Straight Line'], [11, 'Motion in a Plane'],
      [11, 'Laws of Motion'], [11, 'Work, Energy and Power'], [11, 'System of Particles and Rotational Motion'],
      [11, 'Gravitation'], [11, 'Mechanical Properties of Solids'], [11, 'Mechanical Properties of Fluids'],
      [11, 'Thermal Properties of Matter'], [11, 'Thermodynamics'], [11, 'Kinetic Theory'],
      [11, 'Oscillations'], [11, 'Waves'],
      [12, 'Electric Charges and Fields'], [12, 'Electrostatic Potential and Capacitance'],
      [12, 'Current Electricity'], [12, 'Moving Charges and Magnetism'], [12, 'Magnetism and Matter'],
      [12, 'Electromagnetic Induction'], [12, 'Alternating Current'], [12, 'Electromagnetic Waves'],
      [12, 'Ray Optics'], [12, 'Wave Optics'], [12, 'Dual Nature of Radiation and Matter'],
      [12, 'Atoms'], [12, 'Nuclei'], [12, 'Semiconductor Electronics']
    ],
    C: [
      [11, 'Some Basic Concepts of Chemistry'], [11, 'Structure of Atom'],
      [11, 'Classification of Elements and Periodicity'], [11, 'Chemical Bonding and Molecular Structure'],
      [11, 'Chemical Thermodynamics'], [11, 'Equilibrium'], [11, 'Redox Reactions'],
      [11, 'Organic Chemistry: Basic Principles'], [11, 'Hydrocarbons'],
      [12, 'Solutions'], [12, 'Electrochemistry'], [12, 'Chemical Kinetics'], [12, 'p-Block Elements'],
      [12, 'd- and f-Block Elements'], [12, 'Coordination Compounds'], [12, 'Haloalkanes and Haloarenes'],
      [12, 'Alcohols, Phenols and Ethers'], [12, 'Aldehydes, Ketones and Carboxylic Acids'],
      [12, 'Amines'], [12, 'Biomolecules']
    ],
    B: [
      [11, 'The Living World'], [11, 'Biological Classification'], [11, 'Plant Kingdom'], [11, 'Animal Kingdom'],
      [11, 'Morphology of Flowering Plants'], [11, 'Anatomy of Flowering Plants'],
      [11, 'Structural Organisation in Animals'], [11, 'Cell: The Unit of Life'], [11, 'Biomolecules'],
      [11, 'Cell Cycle and Cell Division'], [11, 'Photosynthesis in Higher Plants'],
      [11, 'Respiration in Plants'], [11, 'Plant Growth and Development'],
      [11, 'Breathing and Exchange of Gases'], [11, 'Body Fluids and Circulation'],
      [11, 'Excretory Products and their Elimination'], [11, 'Locomotion and Movement'],
      [11, 'Neural Control and Coordination'], [11, 'Chemical Coordination and Integration'],
      [12, 'Sexual Reproduction in Flowering Plants'], [12, 'Human Reproduction'], [12, 'Reproductive Health'],
      [12, 'Principles of Inheritance and Variation'], [12, 'Molecular Basis of Inheritance'],
      [12, 'Evolution'], [12, 'Human Health and Disease'], [12, 'Microbes in Human Welfare'],
      [12, 'Biotechnology: Principles and Processes'], [12, 'Biotechnology and its Applications'],
      [12, 'Organisms and Populations'], [12, 'Ecosystem'], [12, 'Biodiversity and Conservation']
    ]
  },
  // AIIMS Rishikesh routine. Mon-Sat full study day, Sunday = revision + full mock.
  // PW Yakeen lectures come from the Yakeen tab, so their time sits inside these blocks.
  routine: [
    { time: '05:30', title: 'Uthna, paani, 10 min walk ya stretching', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '06:00', title: 'Biology NCERT line by line + diagrams (2 ghante)', subj: 'B', days: [1, 2, 3, 4, 5, 6] },
    { time: '08:00', title: 'Nashta aur ready hona', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '08:30', title: 'Physics: concept + numericals (2 ghante)', subj: 'P', days: [1, 2, 3, 4, 5, 6] },
    { time: '10:45', title: 'Chemistry: aaj ka topic (Physical, Organic, Inorganic roz badal ke)', subj: 'C', days: [1, 2, 3, 4, 5, 6] },
    { time: '13:00', title: 'Lunch aur 20 min aaram', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '14:00', title: 'Aaj ke lecture ke notes revise + DPP', subj: '', days: [1, 2, 3, 4, 5, 6] },
    { time: '16:00', title: 'Biology MCQ 60 + galtiyon ki list', subj: 'B', days: [1, 2, 3, 4, 5, 6] },
    { time: '17:30', title: 'Break: walk, khel ya ghar ka kaam', subj: '', days: [1, 2, 3, 4, 5, 6] },
    { time: '18:30', title: 'Physics PYQ / numericals (chapter wise)', subj: 'P', days: [1, 2, 3, 4, 5, 6] },
    { time: '20:00', title: 'Dinner', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '20:45', title: 'Chemistry NCERT + reactions aur formulas revision', subj: 'C', days: [1, 2, 3, 4, 5, 6] },
    { time: '22:00', title: 'Din ka review, kal ka plan, backlog entry', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '22:30', title: 'Sona (7 ghante neend zaroori hai)', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '06:00', title: 'Hafte ka Biology revision (is hafte ke chapters)', subj: 'B', days: [0] },
    { time: '08:30', title: 'Physics + Chemistry weekly revision aur formula sheet', subj: '', days: [0] },
    { time: '11:30', title: 'Backlog clear karna', subj: '', days: [0] },
    { time: '14:00', title: 'Full NEET mock test (200 min, asli exam ke time par)', subj: '', days: [0] },
    { time: '17:45', title: 'Mock analysis: har galti ka reason likho', subj: '', days: [0] },
    { time: '20:45', title: 'Agle hafte ka plan + syllabus tracker update', subj: '', days: [0] }
  ]
};
