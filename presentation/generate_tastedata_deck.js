const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'presentation');
const buildDir = path.join(outDir, 'pptx_build');
const pptxPath = path.join(outDir, 'TasteData_IF201_Demo_Presentation.pptx');
const notesPath = path.join(outDir, 'TasteData_IF201_Speaker_Notes.md');

function rm(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, text) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, text, 'utf8');
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
  }
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = table[(c ^ byte) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date = new Date(2026, 4, 12, 12, 0, 0)) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: d };
}

function collectFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(abs, base);
    return [{ abs, rel: path.relative(base, abs).replace(/\\/g, '/') }];
  });
}

function zipStore(srcDir, destFile) {
  const parts = [];
  const central = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const file of collectFiles(srcDir)) {
    const name = Buffer.from(file.rel, 'utf8');
    const data = fs.readFileSync(file.abs);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, data);

    const cent = Buffer.alloc(46);
    cent.writeUInt32LE(0x02014b50, 0);
    cent.writeUInt16LE(20, 4);
    cent.writeUInt16LE(20, 6);
    cent.writeUInt16LE(0x0800, 8);
    cent.writeUInt16LE(0, 10);
    cent.writeUInt16LE(stamp.time, 12);
    cent.writeUInt16LE(stamp.date, 14);
    cent.writeUInt32LE(crc, 16);
    cent.writeUInt32LE(data.length, 20);
    cent.writeUInt32LE(data.length, 24);
    cent.writeUInt16LE(name.length, 28);
    cent.writeUInt16LE(0, 30);
    cent.writeUInt16LE(0, 32);
    cent.writeUInt16LE(0, 34);
    cent.writeUInt16LE(0, 36);
    cent.writeUInt32LE(0, 38);
    cent.writeUInt32LE(offset, 42);
    central.push(cent, name);
    offset += local.length + name.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(collectFiles(srcDir).length, 8);
  eocd.writeUInt16LE(collectFiles(srcDir).length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  fs.writeFileSync(destFile, Buffer.concat([...parts, ...central, eocd]));
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textRuns(text) {
  return String(text)
    .split('\n')
    .map((line, index) => `${index ? '<a:br/>' : ''}<a:r><a:t>${esc(line)}</a:t></a:r>`)
    .join('');
}

function shape(id, name, x, y, cx, cy, fill, line = fill, radius = false) {
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="${radius ? 'roundRect' : 'rect'}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>
        <a:ln><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>
      </p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
    </p:sp>`;
}

function tx(id, name, text, x, y, cx, cy, opts = {}) {
  const size = opts.size || 2600;
  const color = opts.color || 'F4EFE4';
  const bold = opts.bold ? ' b="1"' : '';
  const italic = opts.italic ? ' i="1"' : '';
  const font = opts.font || 'Aptos';
  const align = opts.align ? `<a:pPr algn="${opts.align}"/>` : '<a:pPr/>';
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/>
        <a:lstStyle/>
        <a:p>${align}<a:r><a:rPr lang="en-US" sz="${size}"${bold}${italic}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${esc(text).split('\n')[0] || ''}</a:t></a:r>${String(text).split('\n').slice(1).map(line => `<a:br/><a:r><a:rPr lang="en-US" sz="${size}"${bold}${italic}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${esc(line)}</a:t></a:r>`).join('')}<a:endParaRPr lang="en-US" sz="${size}"/></a:p>
      </p:txBody>
    </p:sp>`;
}

function bulletBox(idStart, items, x, y, cx, cy, opts = {}) {
  const size = opts.size || 2100;
  const color = opts.color || 'F4EFE4';
  const font = opts.font || 'Aptos';
  const paragraphs = items.map(item => `
    <a:p>
      <a:pPr marL="285750" indent="-171450"><a:buChar char="•"/></a:pPr>
      <a:r><a:rPr lang="en-US" sz="${size}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/></a:rPr><a:t>${esc(item)}</a:t></a:r>
    </a:p>`).join('');
  return `
    <p:sp>
      <p:nvSpPr><p:cNvPr id="${idStart}" name="Bullets"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
      <p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>${paragraphs}</p:txBody>
    </p:sp>`;
}

function line(id, x1, y1, x2, y2, color = 'C8B97A') {
  return `
    <p:cxnSp>
      <p:nvCxnSpPr><p:cNvPr id="${id}" name="Connector"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
      <p:spPr><a:xfrm><a:off x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}"/><a:ext cx="${Math.abs(x2 - x1)}" cy="${Math.abs(y2 - y1)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="25400"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></p:spPr>
    </p:cxnSp>`;
}

const W = 12192000;
const H = 6858000;
const slides = [
  {
    title: 'TasteData',
    subtitle: 'Hearing and seeing food from another angle',
    tag: 'IF201 Science, Politics and Engineering of Food',
    body: ['Algorithmic translation of food chemistry into music and future visuals', 'Demo presentation for a non-technical food studies audience'],
    notes: 'Open with the core idea: this is not only a software project. It is a way of asking how food can be perceived, discussed, and represented beyond taste.'
  },
  {
    title: 'Research Question',
    subtitle: 'Can measured food become an audiovisual language?',
    body: ['We usually understand food through tongue, smell, and memory.', 'TasteData asks whether sensors can help us listen to and see food.', 'The project turns mass, pH, temperature, salinity, color, and place into music prompts.'],
    notes: 'Connect to the guideline: clear problem and motivation. The motivation is food literacy through multiple senses.'
  },
  {
    title: 'Why This Belongs In IF201',
    subtitle: 'Food culture, sustainability, and interpretation',
    body: ['Food is biological: pH, heat, salinity, mass, and color are measurable.', 'Food is social: dishes travel, merge, and become contested cultural symbols.', 'Food is sustainable: better sensory awareness can support less wasteful, more respectful food decisions.'],
    notes: 'Do not overclaim that music directly solves sustainability. Say it informs sustainable thinking by making hidden qualities of food visible and discussable.'
  },
  {
    title: 'Methodology',
    subtitle: 'Mixed method: sensors + cultural interpretation + generative media',
    body: ['Quantitative: sensor-like food readings are normalized into musical parameters.', 'Qualitative: dish name, cuisine, description, and notes are analyzed as cultural context.', 'Creative output: the system produces Suno-ready music stems now; visual generation is the next module.'],
    notes: 'This slide answers the methodology requirement. Emphasize that the project combines measurement and interpretation.'
  },
  {
    title: 'How The Workflow Runs',
    subtitle: 'From plate to prompt',
    workflow: true,
    notes: 'Explain the code without code: input, deterministic profile, origin/fusion context, Claude language generation, local fallback, output.'
  },
  {
    title: 'What The Code Shows',
    subtitle: 'The CS professor report',
    body: ['The app is a static web interface with six food inputs.', 'Local JavaScript first creates a deterministic sensory profile, so the result does not depend only on AI.', 'Claude is used as a language composer for Suno prompts, with schema repair and fallback output if the API fails.', 'Tests check boundary cases such as hot soup, cold salad, alkaline stew, and invalid sensor values.'],
    notes: 'This is enough technical detail for the lecture. It shows seriousness without burying the audience in implementation.'
  },
  {
    title: 'What Is This Food’s Ethnicity?',
    subtitle: 'The sociology and food culture report',
    body: ['The system avoids treating origin as one clean owner.', 'Example: mantı, mandu, dumpling, ravioli, pierogi, and jiaozi are different cultural forms of filled dough.', 'TasteData represents this as shared lineage and weighted cultural influence, not as a winner-takes-all claim.', 'Origin enriches rhythm, instrumentation, and narrative, but it never overrides measured food data.'],
    notes: 'Use the professor’s dumpling example directly. The key phrase: ownership is treated as shared lineage, not a final verdict.'
  },
  {
    title: 'Sustainability Connection',
    subtitle: 'Making hidden food information easier to discuss',
    body: ['Sensor readings can reveal preservation, freshness, saltiness, heat, and preparation differences.', 'Cultural-origin analysis encourages respect for shared food heritage instead of narrow ownership claims.', 'Audiovisual translation can make food data more accessible in education, public demos, and community discussion.', 'Future tests can compare meals, leftovers, preparation styles, and storage conditions.'],
    notes: 'Frame sustainability as environmental, social, and educational. Social sustainability is central here because food culture and attribution matter.'
  },
  {
    title: 'Current Results',
    subtitle: 'What is already working',
    body: ['Sensor understanding code is implemented.', 'Ethnicity/origin analysis is implemented with curated dish families and Wikidata lookup.', 'Music generation code produces six stems and mix direction for Suno.', 'The browser demo can run locally; live Claude generation needs the API key/serverless runtime.'],
    notes: 'Be concrete: this is more than an idea. There is a functional prototype and test coverage.'
  },
  {
    title: 'Limitations',
    subtitle: 'What we should be honest about',
    body: ['The origin dataset is still small, so cultural analysis must be presented as an interpretation, not truth.', 'Sensor tests with real meals are just beginning this week.', 'Visual generation is not implemented yet.', 'AI-generated language can sound confident, so the code repairs structure but still requires human review.'],
    notes: 'This matches the guideline’s limitation section and builds trust.'
  },
  {
    title: 'Next Steps',
    subtitle: 'Before the final demo',
    body: ['Test the first real meals with sensors this week.', 'Compare sensor readings with the generated music outputs.', 'Implement visual generation from the same six-input profile.', 'Expand the origin/fusion dataset beyond tacos, dumplings, soups, and early examples.', 'Prepare a final demo where the audience can hear and later see the plate.'],
    notes: 'End with a realistic roadmap. Mention that the coming tests are the bridge from prototype to final demo.'
  },
  {
    title: 'Conclusion',
    subtitle: 'TasteData is a different angle on food',
    body: ['It translates food from taste into sound and future visuals.', 'It connects biology, engineering, culture, and sustainability in one demo.', 'It treats cultural identity carefully: foods can belong to histories, migrations, and communities at the same time.'],
    notes: 'Close with the sentence: We are not replacing taste; we are adding another way to notice what food carries.'
  }
];

function slideXml(slide, index) {
  let id = 10;
  const isTitle = index === 0;
  let content = '';
  content += shape(id++, 'Background', 0, 0, W, H, isTitle ? '11110E' : '151512');
  content += shape(id++, 'AccentBar', 0, 0, W, 114300, 'C8B97A');
  content += tx(id++, 'DeckTag', slide.tag || `TasteData / IF201 / ${index + 1}`, 533400, 323850, 6400000, 300000, { size: 1200, color: 'C8B97A', bold: true });
  content += tx(id++, 'Title', slide.title, 533400, isTitle ? 1450000 : 820000, 7600000, isTitle ? 900000 : 650000, { size: isTitle ? 6200 : 3900, color: 'F4EFE4', font: 'Georgia', italic: isTitle });
  content += tx(id++, 'Subtitle', slide.subtitle, 533400, isTitle ? 2420000 : 1470000, 8200000, 560000, { size: isTitle ? 2300 : 1850, color: 'C8B97A' });

  if (slide.workflow) {
    const boxes = [
      ['Meal + context', 'dish name, place, notes'],
      ['Six readings', 'mass, pH, heat, TDS, color, place'],
      ['Two profiles', 'sensory map + origin/fusion'],
      ['Media prompt', 'Suno stems now, visuals next']
    ];
    boxes.forEach((box, i) => {
      const x = 762000 + i * 2700000;
      content += shape(id++, `Flow${i}`, x, 2800000, 2200000, 980000, i % 2 ? '24251F' : '20304A', 'C8B97A', true);
      content += tx(id++, `FlowTitle${i}`, box[0], x + 190000, 3020000, 1850000, 260000, { size: 1600, color: 'F4EFE4', bold: true, align: 'ctr' });
      content += tx(id++, `FlowSub${i}`, box[1], x + 190000, 3350000, 1850000, 360000, { size: 1150, color: 'B9B4A6', align: 'ctr' });
      if (i < boxes.length - 1) content += line(id++, x + 2200000, 3290000, x + 2700000, 3290000);
    });
    content += tx(id++, 'Fallback', 'If Claude is unavailable, deterministic local output still appears.', 1980000, 4700000, 8200000, 420000, { size: 1700, color: 'B9B4A6', align: 'ctr' });
  } else if (slide.body) {
    if (isTitle) {
      content += bulletBox(id++, slide.body, 838200, 3580000, 8200000, 1250000, { size: 1900, color: 'DED7C8' });
      content += shape(id++, 'SensorStrip', 800000, 5650000, 8400000, 280000, '2B2A22', '2B2A22', true);
      content += tx(id++, 'Sensors', 'mass  /  pH  /  temperature  /  salinity  /  color  /  place', 1100000, 5705000, 7800000, 200000, { size: 1250, color: 'C8B97A', align: 'ctr' });
    } else {
      content += bulletBox(id++, slide.body, 762000, 2320000, 10150000, 3500000, { size: slide.body.length > 4 ? 1750 : 1900, color: 'F4EFE4' });
    }
  }

  content += tx(id++, 'Footer', 'Ada Sarabil / Can Yuzbey / Kutluhan Gok / Spring 2025-2026', 533400, 6430000, 7200000, 220000, { size: 950, color: '77746A' });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${content}</p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function relsForSlide() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function contentTypes(count) {
  const slideOverrides = Array.from({ length: count }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideOverrides}
</Types>`;
}

function presentationXml(count) {
  const ids = Array.from({ length: count }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${ids}</p:sldIdLst>
  <p:sldSz cx="${W}" cy="${H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle/>
</p:presentation>`;
}

function presentationRels(count) {
  const slideRels = Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`;
}

const slideMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;

const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="TasteData">
  <a:themeElements>
    <a:clrScheme name="TasteData"><a:dk1><a:srgbClr val="11110E"/></a:dk1><a:lt1><a:srgbClr val="F4EFE4"/></a:lt1><a:dk2><a:srgbClr val="151512"/></a:dk2><a:lt2><a:srgbClr val="DED7C8"/></a:lt2><a:accent1><a:srgbClr val="C8B97A"/></a:accent1><a:accent2><a:srgbClr val="426A5A"/></a:accent2><a:accent3><a:srgbClr val="5A6E9E"/></a:accent3><a:accent4><a:srgbClr val="A05A4F"/></a:accent4><a:accent5><a:srgbClr val="8A6F3A"/></a:accent5><a:accent6><a:srgbClr val="B9B4A6"/></a:accent6><a:hlink><a:srgbClr val="C8B97A"/></a:hlink><a:folHlink><a:srgbClr val="8A6F3A"/></a:folHlink></a:clrScheme>
    <a:fontScheme name="TasteData"><a:majorFont><a:latin typeface="Georgia"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="TasteData"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;

rm(buildDir);
mkdir(buildDir);
write(path.join(buildDir, '[Content_Types].xml'), contentTypes(slides.length));
write(path.join(buildDir, '_rels/.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
write(path.join(buildDir, 'docProps/core.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>TasteData IF201 Demo Presentation</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2026-05-12T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-05-12T00:00:00Z</dcterms:modified></cp:coreProperties>`);
write(path.join(buildDir, 'docProps/app.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slides.length}</Slides></Properties>`);
write(path.join(buildDir, 'ppt/presentation.xml'), presentationXml(slides.length));
write(path.join(buildDir, 'ppt/_rels/presentation.xml.rels'), presentationRels(slides.length));
write(path.join(buildDir, 'ppt/slideMasters/slideMaster1.xml'), slideMaster);
write(path.join(buildDir, 'ppt/slideMasters/_rels/slideMaster1.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
write(path.join(buildDir, 'ppt/slideLayouts/slideLayout1.xml'), slideLayout);
write(path.join(buildDir, 'ppt/slideLayouts/_rels/slideLayout1.xml.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
write(path.join(buildDir, 'ppt/theme/theme1.xml'), theme);

slides.forEach((slide, i) => {
  write(path.join(buildDir, `ppt/slides/slide${i + 1}.xml`), slideXml(slide, i));
  write(path.join(buildDir, `ppt/slides/_rels/slide${i + 1}.xml.rels`), relsForSlide());
});

const notes = `# TasteData IF201 Speaker Notes

Presentation guideline coverage: research question, sustainability, methodology, results, interpretation, limitations, next steps, and Q&A readiness.

${slides.map((slide, i) => `## Slide ${i + 1}: ${slide.title}

${slide.notes}
`).join('\n')}

## Suggested Q&A Answers

- Why music? Because sound makes invisible food properties easier to notice and compare.
- Is ethnicity analysis claiming ownership? No. It represents shared lineage and weighted cultural influence, especially for foods like manti, mandu, dumplings, ravioli, and pierogi.
- Where is sustainability? In social sustainability through respectful cultural attribution, and in future environmental/food-waste work through sensor comparison of freshness, preservation, and storage.
- What is missing? Real meal tests and visual generation.
`;
write(notesPath, notes);

if (fs.existsSync(pptxPath)) fs.rmSync(pptxPath, { force: true });
zipStore(buildDir, pptxPath);
rm(buildDir);

console.log(`Created ${pptxPath}`);
console.log(`Created ${notesPath}`);
