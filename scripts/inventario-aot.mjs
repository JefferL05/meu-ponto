/** Análise estática reproduzível: não executa o binário nem acessa a rede. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [binario,traducoes,saida]=process.argv.slice(2);
if(!binario||!traducoes||!saida)throw new Error('Uso: node scripts/inventario-aot.mjs libapp.so pt.json saida.json');
const b=await readFile(binario),t=await readFile(traducoes),text=b.toString('latin1');
const digest=x=>createHash('sha256').update(x).digest('hex');
const paths=[...text.matchAll(/package:ponto\/app\/[\x21-\x7e]{1,180}\.dart/g)].map(m=>({fileOffset:m.index,path:m[0]}));
const result={metodo:'Strings ASCII de caminhos Dart em Flutter AOT; inventário das chaves de tradução',limitacoes:['Caminhos não recuperam código-fonte ou fluxo de execução.','Textos descrevem funcionalidades; comportamento não foi executado no Android.','Não constitui descompilação completa.'],binario:{sha256:digest(b),bytes:b.length,elf:b.subarray(0,4).equals(Buffer.from([127,69,76,70]))},traducoes:{sha256:digest(t),bytes:t.length,chaves:Object.keys(JSON.parse(t.toString('utf8')))},paths};
await writeFile(saida,JSON.stringify(result,null,2));console.log(`${paths.length} referências Dart; ${result.traducoes.chaves.length} chaves de tradução.`);
