import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..');
const manifestPath=path.join(root,'src/data/assets.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const provenancePath=path.join(root,'design/asset-provenance.json');
const provenance=JSON.parse(await fs.readFile(provenancePath,'utf8'));
for(const [key,asset] of Object.entries(manifest)){
 const source=path.join(root,'public',asset);
 if(asset.endsWith('.svg')&&(await fs.stat(source)).size>500000){
  const target=source.replace(/\.svg$/,'.webp');
  await sharp(source,{limitInputPixels:100000000,unlimited:true}).resize({width:2400,withoutEnlargement:true}).webp({quality:95,alphaQuality:100}).toFile(target);
  manifest[key]=asset.replace(/\.svg$/,'.webp');
  provenance.assets[key].path=manifest[key];
  provenance.assets[key].derivative='Transparent raster format derivative of the individual source mask, without content or crop changes.';
 }
}
const byHash=new Map();
for(const [key,asset] of Object.entries(manifest)){
 const source=path.join(root,'public',asset);
 const bytes=await fs.readFile(source);const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(byHash.has(hash))manifest[key]=byHash.get(hash);else byHash.set(hash,asset);
 provenance.assets[key].path=manifest[key];
}
const used=new Set(Object.values(manifest).map(value=>path.basename(value)));
for(const file of await fs.readdir(path.join(root,'public/assets'))){if(!used.has(file))await fs.unlink(path.join(root,'public/assets',file));}
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(provenancePath,JSON.stringify(provenance,null,2)+'\n');
console.log({keys:Object.keys(manifest).length,uniqueFiles:used.size});
