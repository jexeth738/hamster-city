// ===== Squeek City — static data =====
const GW = 1280, GH = 720;
const S = 4;            // city map scale (1024 map px -> 4096 world px)
const IS = 1.25;        // interior image scale
const CELL = 8;         // city grid cell in map px (128x128 grid)
const ZOOMIES_RPM = 70;

const PORTRAITS = {
  cheeks: { key: 'portrait0', name: 'DON CHEEKS', color: '#c9c9c9' },
  pixel:  { key: 'portrait1', name: 'PIXEL',      color: '#ffb35c' },
  scar:   { key: 'portrait2', name: 'SCAR',       color: '#ff6b6b' },
  turbo:  { key: 'portrait3', name: "LIL' TURBO", color: '#7fd4ff' },
  squeak: { key: 'ham_classic_front', name: 'YOU', color: '#ffd166' },
};

const CITY = {
  bounds: [58, 48, 966, 944],
  solids: [
    [82, 52, 186, 140], [217, 52, 301, 140], [85, 197, 170, 278], [73, 325, 172, 408], // houses
    [425, 45, 582, 174], [588, 128, 622, 175],           // pet shop + doghouse
    [735, 52, 885, 184], [899, 133, 937, 200],           // grocery + van
    [300, 295, 472, 430],                                 // bank
    [310, 492, 348, 530],                                 // fountain
    [757, 307, 818, 366],                                 // gazebo
    [592, 400, 795, 468], [600, 468, 778, 512], [630, 512, 742, 536], // pond
    [512, 508, 576, 562],                                 // playground
    [68, 658, 242, 760],                                  // garage
    [425, 690, 526, 780],                                 // green house
    [680, 684, 962, 902],                                 // lab
  ],
  hides: [
    [300, 447, 346, 468], [418, 447, 472, 468], [250, 560, 342, 592], [402, 560, 472, 592],
    [153, 556, 210, 604], [516, 298, 560, 340], [826, 290, 872, 338], [868, 380, 905, 420],
  ],
  doors: [
    { id: 'house1', interior: 'house', name: 'Blue House',   x: 128, y: 154, variant: 0 },
    { id: 'house2', interior: 'house', name: 'Pink House',   x: 243, y: 154, variant: 1 },
    { id: 'house3', interior: 'house', name: 'Yellow House', x: 112, y: 292, variant: 2 },
    { id: 'house4', interior: 'house', name: 'Purple House', x: 100, y: 421, variant: 3 },
    { id: 'house5', interior: 'house', name: 'Green House',  x: 470, y: 795, variant: 4 },
    { id: 'petshop', interior: 'petshop', name: 'Pet Shop',  x: 500, y: 188 },
    { id: 'grocery', interior: 'grocery', name: 'Grocery',   x: 808, y: 197 },
    { id: 'bank',    interior: 'bank',    name: 'Hamster Bank', x: 378, y: 446 },
    { id: 'garage',  interior: 'garage',  name: 'Garage',    x: 132, y: 774 },
    { id: 'lab',     interior: 'lab',     name: 'Squeekchain Lab', x: 812, y: 916 },
  ],
  hideout: { x: 787, y: 392 },
  shop: { x: 735, y: 392 },
  start: { x: 787, y: 420 },
  wheel: { x: 847, y: 730, r: 62 },
  roadNodes: {
    A1: [258, 257], A2: [368, 257], A3: [670, 257], A4: [937, 257],
    E1: [368, 70], F1: [670, 70], D1: [258, 512], L1: [100, 512], L2: [100, 648],
    C1: [340, 648], C2: [630, 648], C3: [937, 648], H1: [340, 915], G1: [630, 915],
  },
  roadEdges: [['E1','A2'],['F1','A3'],['A1','A2'],['A2','A3'],['A3','A4'],['A4','C3'],['A1','D1'],['D1','L1'],
    ['L1','L2'],['L2','C1'],['C1','C2'],['C2','C3'],['C1','H1'],['H1','G1'],['G1','C2']],
  vehicleSpawns: [
    { kind: 'rccar', x: 200, y: 800, a: -Math.PI / 2 },
    { kind: 'skate', x: 200, y: 172, a: 0 },
    { kind: 'skate', x: 560, y: 600, a: 0 },
    { kind: 'ball', x: 700, y: 575, a: 0 },
    { kind: 'ball', x: 540, y: 205, a: 0 },
    { kind: 'car', x: 900, y: 70, a: Math.PI / 2, skin: 'car1' },
  ],
  lights: [
    [300, 225], [470, 225], [600, 225], [760, 225], [890, 225], [228, 330], [228, 450], [400, 290], [960, 400],
    [140, 540], [170, 680], [290, 620], [480, 620], [700, 620], [880, 620], [300, 760], [380, 860], [590, 760],
    [560, 880], [665, 120], [395, 120], [910, 560], [60, 600],
  ],
  windows: [[134, 112], [259, 112], [128, 250], [122, 380], [476, 755], [500, 140], [810, 150], [385, 380], [140, 720], [800, 760], [850, 840], [740, 720]],
};

// Interiors: coordinates in 1024 image px; scaled by IS in game
const INTERIORS = {
  house: {
    tex: 'int_house', name: 'House', spawn: [510, 836], exit: [510, 900, 80],
    walls: [[0, 0, 1024, 175], [0, 0, 45, 1024], [985, 0, 1024, 1024], [0, 865, 470, 1024], [552, 865, 1024, 1024],
      [45, 400, 195, 470], [250, 400, 362, 470], [585, 400, 775, 470], [835, 400, 985, 470], [650, 45, 685, 470]],
    solids: [[50, 100, 118, 245], [130, 185, 300, 372], [355, 250, 478, 410], [700, 175, 850, 232], [898, 230, 962, 392],
      [70, 470, 137, 560], [155, 495, 347, 612], [155, 700, 322, 838], [60, 665, 122, 752], [608, 470, 690, 562],
      [715, 515, 842, 738], [858, 470, 946, 562], [872, 688, 968, 800], [618, 745, 732, 842], [330, 175, 402, 218]],
    loot: [[415, 430, 12, 'Fruit bowl'], [365, 240, 15, 'Fridge snacks'], [395, 640, 10, 'Snack basket'], [675, 860, 10, 'Treats'], [920, 830, 20, 'Hamster stash'], [220, 390, 12, 'Cookies']],
    guards: [{ kind: 'owner', path: [[470, 700], [470, 520], [800, 870], [540, 520]] }],
    restricted: false,
  },
  petshop: {
    tex: 'int_petshop', name: 'Pet Shop', spawn: [505, 850], exit: [505, 905, 70],
    walls: [[0, 0, 1024, 95], [0, 0, 88, 1024], [938, 0, 1024, 1024], [0, 868, 452, 1024], [556, 868, 1024, 1024]],
    solids: [[90, 95, 402, 242], [630, 95, 926, 242], [415, 110, 612, 218], [88, 250, 142, 422], [880, 250, 936, 422],
      [88, 540, 142, 718], [880, 540, 936, 722], [180, 285, 374, 422], [625, 285, 846, 422], [415, 288, 497, 402],
      [550, 300, 607, 397], [550, 478, 624, 587], [345, 610, 442, 722], [185, 450, 412, 577], [645, 478, 843, 602],
      [180, 598, 292, 720], [512, 628, 659, 720], [90, 750, 407, 852], [620, 715, 857, 822], [92, 436, 142, 502], [362, 465, 410, 552]],
    loot: [[300, 590, 15, 'Seed bags'], [700, 620, 15, 'Pet food'], [585, 745, 25, 'Cash register'], [250, 264, 10, 'Treat jar'], [760, 262, 12, 'Seed shelf']],
    cages: [[456, 420], [588, 606], [393, 740]],
    guards: [{ kind: 'cat', path: [[500, 440], [500, 780], [800, 450], [200, 440]] }],
    restricted: false,
  },
  grocery: {
    tex: 'int_grocery', name: 'Grocery', spawn: [500, 870], exit: [500, 935, 60],
    walls: [[0, 0, 1024, 212], [0, 0, 142, 1024], [948, 0, 1024, 1024], [0, 885, 452, 1024], [548, 885, 1024, 1024]],
    solids: [[230, 245, 407, 447], [615, 245, 792, 447], [230, 495, 402, 720], [615, 495, 794, 717], [445, 437, 572, 587],
      [430, 765, 575, 838], [885, 220, 948, 307], [868, 370, 948, 642], [888, 662, 948, 752], [885, 755, 948, 862]],
    loot: [[508, 610, 30, 'Seed barrel'], [320, 230, 10, 'Snacks'], [700, 470, 10, 'Cans'], [320, 740, 10, 'Cereal'], [840, 330, 12, 'Fresh fruit'], [600, 860, 15, 'Till']],
    guards: [{ kind: 'cat', path: [[510, 230], [830, 700], [180, 700], [180, 260]] }],
    restricted: false,
  },
  bank: {
    tex: 'int_bank', name: 'Hamster Bank', spawn: [512, 860], exit: [512, 930, 60],
    walls: [[0, 0, 1024, 52], [0, 0, 52, 1024], [975, 0, 1024, 1024], [0, 915, 430, 1024], [594, 915, 1024, 1024],
      [52, 52, 302, 335], [612, 52, 975, 405], [300, 52, 362, 335], [362, 52, 612, 96]],
    solids: [[128, 428, 342, 562], [588, 438, 892, 572], [133, 698, 352, 838], [578, 698, 907, 832], [52, 420, 130, 562], [890, 420, 975, 578],
      [55, 540, 115, 650], [890, 590, 965, 690], [55, 805, 130, 912], [890, 800, 965, 912]],
    loot: [[430, 260, 40, 'Vault seeds'], [530, 290, 40, 'Golden coins'], [480, 330, 30, 'Seed sack'], [240, 600, 15, 'Teller drawer'], [740, 610, 15, 'Teller drawer'], [250, 870, 15, 'Desk drawer']],
    terminals: [[240, 590], [740, 600]],
    vault: [[420, 250], [530, 285], [470, 330]],
    guards: [{ kind: 'vacuum', path: [[200, 650], [820, 650]] }, { kind: 'vacuum', path: [[480, 380], [480, 880], [820, 870]] }],
    restricted: [362, 96, 612, 360],
  },
  garage: {
    tex: 'int_garage', name: 'Garage', spawn: [500, 790], exit: [500, 890, 140],
    walls: [[0, 0, 1024, 92], [0, 0, 40, 1024], [985, 0, 1024, 1024], [0, 830, 355, 1024], [645, 830, 1024, 1024]],
    solids: [[72, 82, 157, 218], [160, 112, 228, 222], [235, 102, 300, 218], [360, 92, 642, 248], [688, 80, 777, 222], [783, 102, 852, 238],
      [863, 88, 952, 222], [826, 212, 952, 322], [132, 232, 182, 298], [58, 298, 120, 448], [64, 486, 137, 612], [902, 400, 958, 502],
      [838, 488, 947, 582], [868, 585, 947, 717], [68, 648, 212, 808], [788, 688, 917, 802], [345, 340, 667, 592]],
    loot: [[500, 275, 20, 'Toolbox cash'], [180, 330, 10, 'Spare change'], [880, 345, 12, 'Seed tin'], [300, 760, 10, 'Coin jar']],
    keys: [500, 275],
    guards: [],
    restricted: false,
  },
  lab: {
    tex: 'int_lab', name: 'Squeekchain Lab', spawn: [515, 880], exit: [515, 955, 70],
    walls: [[0, 0, 1024, 40], [0, 0, 38, 1024], [985, 0, 1024, 1024], [0, 912, 470, 1024], [562, 912, 1024, 1024]],
    solids: [[340, 70, 722, 472], [102, 72, 308, 218], [732, 72, 928, 218], [118, 268, 232, 362], [798, 262, 916, 362],
      [138, 432, 268, 562], [238, 568, 347, 692], [676, 542, 772, 672], [793, 488, 912, 587], [83, 708, 197, 812],
      [238, 758, 387, 882], [636, 758, 782, 882], [803, 712, 917, 812], [462, 588, 562, 680]],
    loot: [[175, 395, 20, 'Lab snacks'], [860, 395, 20, 'Lab snacks'], [140, 850, 20, 'Spare seeds']],
    terminals: [[175, 392], [858, 392], [140, 840]],
    pedestal: [512, 625],
    wheel: [525, 250],
    guards: [{ kind: 'vacuum', path: [[300, 500], [740, 500]] }, { kind: 'vacuum', path: [[420, 720], [600, 720], [600, 860]] },
      { kind: 'vacuum', path: [[90, 420], [90, 640], [300, 720]] }],
    restricted: [38, 40, 985, 912],
  },
};

const SHOP = [
  { id: 'speed', name: 'Turbo Paws', desc: '+12% run speed', costs: [60, 160, 320] },
  { id: 'sack', name: 'Bigger Cheeks', desc: 'Carry more seeds', costs: [50, 150, 400] },
  { id: 'dash', name: 'Cheek Dash', desc: 'SHIFT/B dash burst', costs: [90, 240] },
  { id: 'armor', name: 'Walnut Helmet', desc: '-20% damage each', costs: [80, 200, 420] },
];
const SACK_CAPS = [250, 500, 1000, 5000];
const SKINS = [
  { id: 'classic', name: 'Classic Bandit', cost: 0 },
  { id: 'strawberry', name: 'Strawberry', cost: 150 },
  { id: 'midnight', name: 'Midnight', cost: 220 },
  { id: 'squeek', name: 'Squeek Blue', cost: 320 },
  { id: 'golden', name: 'Golden Squeek', cost: 600 },
];

// ===== Missions =====
// area 'city' coords are map px; interior coords are image px.
const MISSIONS = [
  { id: 'm1', title: 'Cheeky Beginnings', giver: 'cheeks', reward: 60,
    intro: [['cheeks', "So you're the new cheeks in town. Squeek City runs on seeds, kid... and we take ours."],
      ['cheeks', "Grocery store. Big seed barrel in the middle. Fill that sack and bring it back here to the gazebo."],
      ['squeak', "Easy. In and out. Nobody sees a thing."]],
    steps: [
      { t: 'enter', door: 'grocery', text: 'Sneak into the GROCERY' },
      { t: 'loot', area: 'grocery', items: [[508, 610]], text: 'Raid the big SEED BARREL' },
      { t: 'exit', text: 'Get out of the store' },
      { t: 'goto', area: 'city', x: 787, y: 392, r: 22, text: 'Bring the seeds back to the HIDEOUT' },
    ],
    outro: [['cheeks', "Heh. Not bad. You got cheeks AND guts. Come back when you want real work."]] },
  { id: 'm2', title: 'Hot Wheels', giver: 'turbo', reward: 80,
    intro: [['turbo', "Yo! Lil' Turbo here. Every crew needs wheels, and the Garage has a sweet RC racer."],
      ['turbo', "Swipe the remote key from the workbench, then hop in and bring her home. 60 seconds, don't scratch her!"]],
    steps: [
      { t: 'enter', door: 'garage', text: 'Break into the GARAGE' },
      { t: 'loot', area: 'garage', items: [[500, 275]], text: 'Grab the RC KEY from the workbench' },
      { t: 'exit', text: 'Leave the garage' },
      { t: 'vehicle', kind: 'rccar', spawn: { kind: 'rccar', x: 205, y: 805 }, text: 'Hop in the RED RC RACER (E / A)' },
      { t: 'goto', area: 'city', x: 787, y: 392, r: 30, time: 60, kind: 'any', text: 'Drive it to the HIDEOUT' },
    ],
    outro: [['turbo', "Vroom vroom, baby! Keep her. You can grab any car on the street too — just press E next to it."]] },
  { id: 'm3', title: 'Cousin Breakout', giver: 'scar', reward: 120,
    intro: [['scar', "The Pet Shop's got three of our cousins in cages. Price tags on their heads. Not on my watch."],
      ['scar', "Open all three cages. The shop cat WILL raise the alarm. Then shake off the heat."]],
    steps: [
      { t: 'enter', door: 'petshop', text: 'Get inside the PET SHOP' },
      { t: 'loot', area: 'petshop', items: [[456, 420], [588, 606], [393, 740]], label: 'cage', text: 'Free the caged cousins' },
      { t: 'stars', n: 2 },
      { t: 'exit', text: 'Escape the pet shop!' },
      { t: 'lose', text: 'LOSE THE HEAT — hide in bushes or outrun them' },
    ],
    outro: [['scar', "Three cousins free. They owe you one. So do I."]] },
  { id: 'm4', title: 'Midnight Snack', giver: 'cheeks', reward: 120,
    intro: [['cheeks', "The Blue House keeps a snack stash. Fruit, cookies, the good stuff."],
      ['cheeks', "The lady of the house swings a mean broom. Grab 3 snacks without getting swept."]],
    steps: [
      { t: 'enter', door: 'house1', text: 'Sneak into the BLUE HOUSE' },
      { t: 'loot', area: 'house', items: [[415, 430], [365, 240], [920, 830]], text: 'Steal 3 SNACKS' },
      { t: 'exit', text: 'Slip out the front door' },
      { t: 'goto', area: 'city', x: 787, y: 392, r: 22, text: 'Back to the HIDEOUT' },
    ],
    outro: [['cheeks', "Mmm. Fresh. You're making the family proud."]] },
  { id: 'm5', title: 'Nine Lives', giver: 'scar', reward: 150,
    intro: [['scar', "The alley cats think they own this town. Time to show them who's fast."],
      ['scar', "I just tipped them off. Survive 45 seconds with THREE stars, then vanish."]],
    steps: [
      { t: 'stars', n: 3 },
      { t: 'survive', time: 45, text: 'SURVIVE the chase' },
      { t: 'lose', text: 'Now LOSE the heat' },
    ],
    outro: [['scar', "Still breathing? Respect."]] },
  { id: 'm6', title: 'Ball Boy', giver: 'turbo', reward: 140,
    intro: [['turbo', "Hamster ball race! Classic. There's a ball in the park by the pond."],
      ['turbo', "Hit every checkpoint around the park before time runs out. Roll, baby, roll!"]],
    steps: [
      { t: 'vehicle', kind: 'ball', text: 'Climb into a HAMSTER BALL (park)' },
      { t: 'checkpoints', kind: 'ball', time: 80, pts: [[520, 285], [700, 285], [900, 330], [900, 560], [760, 600], [520, 600], [480, 450]], text: 'Hit the CHECKPOINTS' },
    ],
    outro: [['turbo', "That's what I call cardio!"]] },
  { id: 'm7', title: 'Board Meeting', giver: 'turbo', reward: 160,
    intro: [['turbo', "Seed bags fell off a truck. All over the main road. Total coincidence."],
      ['turbo', "Grab a skateboard and scoop up all 8 bags. 75 seconds!"]],
    steps: [
      { t: 'vehicle', kind: 'skate', text: 'Find a SKATEBOARD' },
      { t: 'checkpoints', kind: 'skate', bags: true, time: 75, pts: [[300, 257], [450, 257], [600, 257], [800, 257], [937, 400], [937, 560], [800, 648], [600, 648]], text: 'Collect the SEED BAGS' },
    ],
    outro: [['turbo', "Sick kickflips. Literally, you looked sick."]] },
  { id: 'm8', title: 'Inside Info', giver: 'pixel', reward: 180,
    intro: [['pixel', "Pixel. Hacker. Hi. The bank's vault codes sit on the two teller terminals."],
      ['pixel', "Stand at each terminal till my USB finishes copying. Don't let the robo-vacuums spot you."]],
    steps: [
      { t: 'enter', door: 'bank', text: 'Walk into the HAMSTER BANK' },
      { t: 'scan', area: 'bank', pts: [[240, 590], [740, 600]], text: 'HACK the teller terminals' },
      { t: 'exit', text: 'Walk out like nothing happened' },
    ],
    outro: [['pixel', "Codes decrypted. Vault opens at our command. Tell the Don."]] },
  { id: 'm9', title: 'The Vault', giver: 'cheeks', reward: 300,
    intro: [['cheeks', "This is it, kid. The Hamster Bank vault. A lifetime of seeds."],
      ['cheeks', "Grab all three sacks. The alarm WILL trip. Four stars. Then you disappear."]],
    steps: [
      { t: 'enter', door: 'bank', text: 'Enter the HAMSTER BANK' },
      { t: 'loot', area: 'bank', items: [[420, 250], [530, 285], [470, 330]], text: 'Loot the VAULT sacks' },
      { t: 'stars', n: 4 },
      { t: 'exit', text: 'GET OUT!' },
      { t: 'lose', text: 'Lose the PEST CONTROL heat' },
      { t: 'goto', area: 'city', x: 787, y: 392, r: 22, text: 'Bring the loot to the HIDEOUT' },
    ],
    outro: [['cheeks', "...I haven't cried since the Great Wheel Collapse of '09. Beautiful work."]] },
  { id: 'm10', title: 'Pest Control', giver: 'scar', reward: 220,
    intro: [['scar', "Pest Control's been sniffing around our gazebo. Let's give them a tour of the city."],
      ['scar', "Grab any car, hit the 4 checkpoints with 4 stars on your tail."]],
    steps: [
      { t: 'vehicle', kind: 'any', text: 'Get in any VEHICLE' },
      { t: 'stars', n: 4 },
      { t: 'checkpoints', time: 90, pts: [[258, 400], [340, 860], [630, 860], [937, 330]], text: 'Lead them through the CHECKPOINTS' },
      { t: 'lose', text: 'Now LOSE them' },
    ],
    outro: [['scar', "They'll be picking toy-car tires out of their van for weeks."]] },
  { id: 'm11', title: 'Proof of Squeek', giver: 'pixel', reward: 200,
    intro: [['pixel', "Fun fact: Squeekchain is a REAL hamster-powered blockchain. Squeektoshi runs on a wheel, blocks get mined."],
      ['pixel', "When he runs, the city wakes up. When he sleeps, it's night. Every new block drops GOLDEN SEEDS around town."],
      ['pixel', "Collect 3 golden block-seeds. I'll mark them on your map."]],
    steps: [
      { t: 'golden', n: 3, text: 'Collect 3 GOLDEN BLOCK-SEEDS' },
    ],
    outro: [['pixel', "Those seeds carry real block data. Squeektoshi's work, in your cheeks."]] },
  { id: 'm12', title: 'Lab Recon', giver: 'pixel', reward: 250,
    intro: [['pixel', "Final prep. The Squeekchain Lab guards the Genesis Golden Seed — the first seed ever mined."],
      ['pixel', "Upload my worm to 3 lab terminals. Security vacuums everywhere. Stay out of their sight."]],
    steps: [
      { t: 'enter', door: 'lab', text: 'Infiltrate the SQUEEKCHAIN LAB' },
      { t: 'scan', area: 'lab', pts: [[175, 392], [858, 392], [140, 840]], text: 'HACK the lab terminals' },
      { t: 'exit', text: 'Exfiltrate' },
    ],
    outro: [['pixel', "Security is looping old footage. Tomorrow... we go for the Genesis Seed."]] },
  { id: 'm13', title: 'Genesis Heist', giver: 'cheeks', reward: 1000,
    intro: [['cheeks', "Everything led here. The Genesis Golden Seed. Block zero."],
      ['turbo', "I left a getaway racer behind the Garage."],
      ['scar', "I'll keep the cats busy. Mostly."],
      ['pixel', "Grab the seed from the pedestal, and RUN. Five stars. No pressure."]],
    steps: [
      { t: 'enter', door: 'lab', text: 'Enter the SQUEEKCHAIN LAB' },
      { t: 'loot', area: 'lab', items: [[512, 625]], label: 'genesis', text: 'Take the GENESIS GOLDEN SEED' },
      { t: 'stars', n: 5 },
      { t: 'exit', text: 'RUN!!!' },
      { t: 'vehicle', kind: 'rccar', spawn: { kind: 'rccar', x: 205, y: 805 }, text: 'Reach the GETAWAY RACER at the Garage' },
      { t: 'lose', text: 'Shake off EVERYONE' },
      { t: 'goto', area: 'city', x: 787, y: 392, r: 30, text: 'Bring the Genesis Seed HOME' },
    ],
    outro: [['cheeks', "Kid... you just robbed block zero. Squeek City is ours."],
      ['pixel', "And Squeektoshi? He's still running. Every block he mines... we'll be there."],
      ['squeak', "THE END... for now. Thanks for playing! (Golden Squeek skin unlocked)"]] },
];

const SIDEJOBS = [
  { id: 'courier', title: 'Seed Courier', x: 860, y: 220, desc: 'Deliver a parcel to a house door before time runs out.' },
  { id: 'smash', title: 'Vacuum Bash', x: 225, y: 830, desc: 'Ram 3 robot vacuums with a vehicle in 60s.' },
];
