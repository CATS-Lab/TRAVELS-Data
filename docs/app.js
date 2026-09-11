const locations = {
  iowa: {
    kicker: 'SITE 01 · PUBLIC RUN DETAIL', title: 'Iowa', context: 'Eastern Iowa',
    description: 'A 47-mile mixed route connects Iowa City, Hills, Riverside and Kalona across urban, small-town and rural roads.',
    facts: [['Program','ADS for Rural America'],['Public record','80 completed drives'],['Roads','Highway · gravel · unmarked']],
    stats: [['47 mi','mixed-road route'],['80','completed drives'],['6','collection phases'],['2021–23','collection period']],
    link: 'https://data.adsforruralamerica.uiowa.edu/', linkLabel: 'Open ADS for Rural America data ↗'
  },
  texas: {
    kicker: 'SITE 02 · PUBLIC RUN DETAIL', title: 'Texas', context: 'Bryan area',
    description: 'Four Automated Vehicles for All portal runs organize rural driving by pavement condition, from good pavement to severely degraded roads.',
    facts: [['Program','Automated Vehicles for All (AVA)'],['Public record','4 portal runs'],['Focus','Trajectory · planning · control']],
    stats: [['4','portal runs'],['2024–25','collection dates'],['2','good-pavement runs'],['2','degraded-road runs']],
    link: 'https://avadataportal.web.illinois.edu/visualization.html', linkLabel: 'Open Automated Vehicles for All data ↗'
  },
  illinois: {
    kicker: 'SITE 03 · PROGRAM COVERAGE', title: 'Illinois', context: 'State-level coverage',
    description: 'Illinois is named in the Automated Vehicles for All multi-university program footprint. The working deck does not identify a specific public route here.',
    facts: [['Program','Automated Vehicles for All (AVA)'],['Detail level','Program-reported'],['Status','Route detail to verify']],
    stats: [['IL','reported location'],['AVA','Automated Vehicles for All'],['Program','coverage level'],['—','public route not specified']],
    link: 'https://avadataportal.web.illinois.edu/visualization.html', linkLabel: 'Open Automated Vehicles for All data ↗'
  },
  virginia: {
    kicker: 'SITE 04 · PROGRAM COVERAGE', title: 'Virginia', context: 'Northern Virginia',
    description: 'Northern Virginia is listed among Automated Vehicles for All collection locations; route-level information is not specified in the working deck.',
    facts: [['Program','Automated Vehicles for All (AVA)'],['Detail level','Program-reported'],['Status','Route detail to verify']],
    stats: [['VA','reported location'],['AVA','Automated Vehicles for All'],['Program','coverage level'],['—','public route not specified']],
    link: 'https://avadataportal.web.illinois.edu/visualization.html', linkLabel: 'Open Automated Vehicles for All data ↗'
  },
  dc: {
    kicker: 'SITE 05 · PROGRAM COVERAGE', title: 'Washington, D.C.', context: 'District-level coverage',
    description: 'Washington, D.C. appears in the Automated Vehicles for All collection footprint and is retained here as contextual program coverage.',
    facts: [['Program','Automated Vehicles for All (AVA)'],['Detail level','Program-reported'],['Status','Route detail to verify']],
    stats: [['D.C.','reported location'],['AVA','Automated Vehicles for All'],['Program','coverage level'],['—','public route not specified']],
    link: 'https://avadataportal.web.illinois.edu/visualization.html', linkLabel: 'Open Automated Vehicles for All data ↗'
  }
};

const datasets = {
  iowa: {
    tab: 'tab-iowa', org: 'University of Iowa · DSRI', name: 'ADS for Rural America', intro: 'Public multimodal driving data connecting automation performance with vehicle, roadway, environmental and human-factor measurements.', link: 'https://data.adsforruralamerica.uiowa.edu/', linkLabel: 'Open ADS data portal ↗',
    modalities: [
      ['01','Perception','Camera video · VLP-32C and VLP-16 LiDAR · ARS 408-21 radar · Mobileye 6'],
      ['02','Localization & vehicle','NovAtel GNSS/IMU · CAN · PACMod feedback · HD map'],
      ['03','Automation','Apollo perception · planned path · commands · engagement and takeovers'],
      ['04','Road & people','Road sensor · weather · V2V · surveys · physiological signals']
    ]
  },
  ava: {
    tab: 'tab-ava', org: 'Texas A&M–led collaboration', name: 'Automated Vehicles for All (AVA)', intro: 'Rural-driving data and playback centered on perception, motion planning, control, trajectory and vehicle performance.', link: 'https://avadataportal.web.illinois.edu/visualization.html', linkLabel: 'Open AVA Data Hub ↗',
    modalities: [
      ['01','Perception','Camera imagery · LiDAR · radar · multi-sensor fusion'],
      ['02','Localization & trajectory','GPS/IMU · NovAtel odometry · smoothed trajectories · UTM Zone 14N'],
      ['03','ADS modules','Object and lane detection · segmentation · motion planning · drive-by-wire'],
      ['04','Vehicle performance','Autonomous status · tracking error · velocity · acceleration · curvature']
    ]
  }
};

const metrics = {
  tlc: {
    code:'TLC', question:'Is there enough time to keep the vehicle inside its lane?',
    copy:'TLC estimates how long it would take the vehicle to reach a lane boundary if its current motion continued without corrective steering.',
    direction:'Smaller TLC = less time to react', meaning:'If the driver reacts late, little time may remain to prevent a lane departure.',
    formula:'TLC<sub>remaining</sub> = TLC<sub>at failure</sub> − driver reaction time',
    threshold:'TLC<sub>remaining</sub> &lt; 0.5 s', note:'Flag the event for closer review; calibrate with simulator and field data.',
    terms:[['TLC at failure','Predicted time from automation failure to lane crossing.'],['Driver reaction time','Time between the failure and the driver’s response.']]
  },
  ttc: {
    code:'invTTC', question:'Is the vehicle closing on an obstacle too quickly?',
    copy:'Inverse Time to Collision combines the closing speed and the remaining gap to describe the urgency of a possible rear-end conflict.',
    direction:'Larger invTTC = more urgent conflict', meaning:'A short gap is more concerning when the ego vehicle is also approaching the lead vehicle quickly.',
    formula:'invTTC = closing speed ÷ distance',
    threshold:'invTTC &gt; 0.3 s<sup>−1</sup>', note:'Use as a screening value based on simulator analysis, not as a universal safety boundary.',
    terms:[['Closing speed','Ego-vehicle speed minus lead-vehicle speed.'],['Distance','Longitudinal gap between the ego and lead vehicles.']]
  },
  control: {
    code:'Mₑ · Mζ', question:'Is the steering becoming unstable or uncomfortable?',
    copy:'The steering signal is separated into low- and high-frequency motion. The two bands point to different problems and should not be collapsed into one score.',
    direction:'Low frequency = instability · high frequency = discomfort', meaning:'Slow oscillation can reveal controller instability; rapid oscillation can indicate poor ride quality.',
    formula:'Mₑ: 1.1–4 Hz&nbsp;&nbsp;&nbsp; Mζ: 4–10 Hz',
    threshold:'Mₑ &gt; 0.25&nbsp;&nbsp;or&nbsp;&nbsp;Mζ &gt; 0.7', note:'Flag either condition, then inspect speed, road friction and controller behavior.',
    terms:[['Mₑ','Magnitude of low-frequency steering oscillation.'],['Mζ','Magnitude of high-frequency steering oscillation.']]
  },
  odd: {
    code:'γ · q', question:'Is the AV operating outside the conditions it handles well?',
    copy:'We pair a perception-quality signal with a lateral-stability signal. Together they indicate whether the system is degrading before or during takeover.',
    direction:'Lower γ = weaker perception · q outside bounds = instability', meaning:'These are two supporting indicators with different units; they are reviewed together, not added into one score.',
    formula:'γ = lane-detection overlap&nbsp;&nbsp;&nbsp; q = β + B₁β̇',
    threshold:'γ &lt; 0.85&nbsp;&nbsp;or&nbsp;&nbsp;q outside [B₂, B₃]', note:'The stability bounds depend on speed, road friction and steering angle.',
    terms:[['γ','Predicted lane-detection multi-Dice score.'],['q','Lateral-stability value using sideslip angle β and its rate of change.']]
  }
};

const stacks = {
  dataspeed: {kicker:'VEHICLE DEVELOPMENT BASE',title:'DataSpeed AV software architecture',description:'A ROS-based pipeline connecting sensing and localization to motion planning, trajectory control and drive-by-wire actuation.',nodes:[
    ['Sensors & drivers','Cameras, LiDAR, radar','accent'],['Perception','LiDAR segmentation · obstacle tracking',''],['Motion planning','Route · speed profile · trajectory',''],['Trajectory control','Steering and speed commands',''],['DataSpeed DBW','Vehicle interface · CAN bus','accent'],['GNSS / IMU','NovAtel positioning','row-two'],['Localization','Pose and vehicle state','row-two'],['Route database','HD map and route path','row-two'],['Safety & system manager','Run enable · diagnostics · trajectory status','row-two monitor'],['Visualization','RViz · autonomy_viz · diagnostics','row-two monitor no-arrow']
  ]},
  autoware: {kicker:'MODULAR AUTONOMY BASE',title:'Autoware software architecture',description:'A modular autonomy stack organized around sensing, perception, planning, control, vehicle interfaces and system-level APIs.',nodes:[
    ['Sensing','Camera · LiDAR · radar · GNSS / INS','accent'],['Perception','Objects · traffic lights · free space',''],['Planning','Mission · behavior · motion trajectory',''],['Control','Lateral and longitudinal control',''],['Vehicle interface','Commands · status · platform adapters','accent'],['Map','Lanelet2 vector map · point cloud map','row-two'],['Localization','Pose · twist · acceleration','row-two'],['System / AD API','Operation mode · routing · diagnostics · fail-safe','row-two accent'],['Monitoring & HMI','System state · operator access','row-two monitor no-arrow']
  ]}
};

function setLocation(key){
  const item=locations[key]; if(!item) return;
  document.querySelector('#location-kicker').textContent=item.kicker;
  document.querySelector('#location-title').textContent=item.title;
  document.querySelector('#location-context').textContent=item.context;
  document.querySelector('#location-description').textContent=item.description;
  document.querySelector('#location-facts').innerHTML=item.facts.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  document.querySelector('#location-stats').innerHTML=item.stats.map(([value,label])=>`<div><strong>${value}</strong><span>${label}</span></div>`).join('');
  const link=document.querySelector('#location-link');link.href=item.link;link.textContent=item.linkLabel;
}
function setDataset(key){
  const d=datasets[key];
  document.querySelectorAll('[data-dataset]').forEach(b=>{const on=b.dataset.dataset===key;b.setAttribute('aria-selected',on);});
  const panel=document.querySelector('#dataset-panel');panel.setAttribute('aria-labelledby',d.tab);
  document.querySelector('#dataset-org').textContent=d.org;document.querySelector('#dataset-name').textContent=d.name;document.querySelector('#dataset-intro').textContent=d.intro;
  const link=document.querySelector('#dataset-link');link.href=d.link;link.textContent=d.linkLabel;
  document.querySelector('#modality-grid').innerHTML=d.modalities.map(([n,t,p])=>`<div class="modality"><small>${n}</small><strong>${t}</strong><p>${p}</p></div>`).join('');
}
function setMetric(key){
  const m=metrics[key];document.querySelectorAll('[data-metric]').forEach(b=>{const on=b.dataset.metric===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on)});
  document.querySelector('#metric-code').textContent=m.code;
  document.querySelector('#metric-question').textContent=m.question;
  document.querySelector('#metric-copy').textContent=m.copy;
  document.querySelector('#metric-direction').textContent=m.direction;
  document.querySelector('#metric-meaning').textContent=m.meaning;
  document.querySelector('#metric-formula').innerHTML=m.formula;
  document.querySelector('#metric-threshold').innerHTML=m.threshold;
  document.querySelector('#metric-note').textContent=m.note;
  document.querySelector('#metric-terms').innerHTML=m.terms.map(([term,definition])=>`<div><strong>${term}</strong><span>${definition}</span></div>`).join('');
}
function setStack(key){
  const s=stacks[key];document.querySelectorAll('[data-stack]').forEach(b=>{const on=b.dataset.stack===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on)});
  document.querySelector('#stack-kicker').textContent=s.kicker;document.querySelector('#stack-title').textContent=s.title;document.querySelector('#stack-description').textContent=s.description;
  document.querySelector('#stack-diagram').innerHTML=s.nodes.map(([t,p,c])=>`<div class="stack-node ${c}"><strong>${t}</strong><small>${p}</small></div>`).join('');
}

document.querySelectorAll('.map-marker').forEach(m=>{m.addEventListener('click',()=>setLocation(m.dataset.location));m.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setLocation(m.dataset.location)}})});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.map-marker').forEach(m=>m.classList.toggle('is-hidden',b.dataset.filter!=='all'&&!m.classList.contains(`${b.dataset.filter}-marker`)))}));
document.querySelectorAll('[data-dataset]').forEach(b=>b.addEventListener('click',()=>setDataset(b.dataset.dataset)));
document.querySelectorAll('[data-metric]').forEach(b=>b.addEventListener('click',()=>setMetric(b.dataset.metric)));
document.querySelectorAll('[data-stack]').forEach(b=>b.addEventListener('click',()=>setStack(b.dataset.stack)));
const menu=document.querySelector('.menu-button');menu.addEventListener('click',()=>{const nav=document.querySelector('.main-nav');const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.main-nav').classList.remove('open');menu.setAttribute('aria-expanded','false')}));
setDataset('iowa');setMetric('tlc');setStack('dataspeed');
