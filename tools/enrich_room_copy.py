import json
from pathlib import Path
ROOT=Path(__file__).parents[1]
s=(ROOT/'src'/'room-data.js').read_text(); rooms=json.loads(s.split('=',1)[1].rsplit(';',1)[0])
chapter_words=['clockwork','overgrown','glacial','furnace','electrical','literary','lunar','tidal','obsidian','prismatic']
shape_words=['entry route','split chamber','lock circuit','weight puzzle','patrol crossing','long detour','branching junction','commitment route','gauntlet','crown trial']
for r in rooms:
 f=r['features']; feature_text=', '.join(f) if f else 'pure route reading'
 r['designNote']=f"{r['name']} is a {chapter_words[r['chapter']]} {shape_words[r['stage']]} with a unique wall graph and {feature_text}. Its verified route is {r['optimalTurns']} turns."
 if 'crate' in f and 'ice' in f: hint='Set the crate before committing to the ice lane; you cannot pull it back.'
 elif 'crate' in f: hint='The gate must stay powered after Pip leaves the plate. That is the crate’s job.'
 elif 'key' in f and 'teleport' in f: hint='Decide which side of the coil needs the key before opening the lock.'
 elif 'key' in f: hint='The key is reachable before the lock, but the shortest-looking route is not always the useful one.'
 elif 'teleport' in f: hint='The paired coils replace a broken corridor. Treat them as one two-way doorway.'
 elif 'fragile' in f: hint='Cracked tiles remember your visit. Collect the far branch before sealing your return.'
 elif 'conveyor' in f: hint='Conveyors resolve immediately after your step. Plan the landing square, not the belt square.'
 elif 'ice' in f: hint='Ice preserves your direction until a wall or solid floor stops the slide.'
 elif 'hazard' in f or 'spikes' in f: hint='Read the safe floor as a route, not as empty space. Enemies move after Pip.'
 else: hint='Collect all three Prism Sparks, then enter the lift. Use branches to control patrol timing.'
 r['hint']=hint
(ROOT/'src'/'room-data.js').write_text('// Generated once as explicit authored room data. Runtime never mutates this source.\nexport const ROOM_DATA = '+json.dumps(rooms,separators=(',',':'))+';\n')
