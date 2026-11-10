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
  // Starter daily routine. Edit in Plan > Daily > Edit.
  routine: [
    { time: '05:30', title: 'Uthna, fresh hona, paani', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '06:00', title: 'Biology NCERT padhna', subj: 'B', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '09:00', title: 'Lecture ke liye ready, notes copy', subj: '', days: [1, 2, 3, 4, 5, 6] },
    { time: '14:00', title: 'Physics DPP aur numericals', subj: 'P', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '16:30', title: 'Chemistry revision', subj: 'C', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '18:30', title: 'Biology MCQ practice', subj: 'B', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '21:00', title: 'Backlog clear karna', subj: '', days: [0, 1, 2, 3, 4, 5, 6] },
    { time: '22:30', title: 'Din ka review aur sona', subj: '', days: [0, 1, 2, 3, 4, 5, 6] }
  ]
};
