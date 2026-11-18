"""Copy the authoritative Swift calculations. No calculation-body translation.
Usage: python3 scripts/sync-actuarial-source.py /path/to/Aktuer\ MacOS
"""
import hashlib, json, re, sys
from pathlib import Path

native = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'actuarial-service/Sources'
target.mkdir(parents=True, exist_ok=True)
core_path = native / 'AKTUER/Modules/Aktuerya/Calculation/AktueryaCalculationCore.swift'
views_path = native / 'AKTUER/Modules/Aktuerya/View/AktueryaModuleViews.swift'
core = core_path.read_text()
views = views_path.read_text()
def block(source, marker):
    start = source.index(marker)
    opening = source.index('{', start)
    depth = 1
    i = opening + 1
    while depth:
        if source[i] == '{': depth += 1
        if source[i] == '}': depth -= 1
        i += 1
    return source[start:i]

core = re.sub(r'^import .+\n', '', core, flags=re.M)
for name in ['IGTDavaliInput', 'IGTOdemeInput', 'IGTBordroUcretInput', 'IGTDestekInput', 'IGTInputSnapshot']:
    core = core.replace('struct '+name+' {', 'struct '+name+': Codable {')
(target/'Core.swift').write_text('import Foundation\n// Generated: computation bodies are unchanged.\n'+core)
(target/'AppFormatters.swift').write_text((native/'AKTUER/AppFormatters.swift').read_text())
models = block(views, 'enum CompensationEntryMode:')+'\n'+block(views, 'struct DYKTDulEsEvlenmeRow:')
# UUID is presentation identity, not a required field in the web request.
models = models.replace('var id = UUID()', 'var id: UUID? = nil')
(target/'Models.swift').write_text('import Foundation\n'+models+'\n')
ggo = block(views, '    private func buildGgoMonthData(')
start = views.index('    private func getBracketRate(')
end = views.index('    private func fmtMoney(',start)
ggo += '\n'+views[start:end]
month = block(views, 'private struct GGOMonthData').replace('private struct GGOMonthData {','struct GGOMonthData: Codable {')
minimum = block(views, 'private struct GGOMinimumTarget').replace('private struct','struct')
tax = block(views,'private struct GGOTaxBracket').replace('private struct','struct')
meal = block(views,'private struct GGOYemekIstisnaItem').split('    static let defaultSeed:')[0]+'}\n'
meal = meal.replace('private struct','struct')
reverse = block(views,'    private func calculateGrossFromNet()')
reverse = reverse[reverse.index('        let netFromBrut:'):reverse.index('        brutText =')]
reverse = reverse.replace('let year = selectedYear','').replace('netInputText','')
(target/'GGO.swift').write_text('import Foundation\n'+month+'\n'+minimum+'\n'+tax+'\n'+meal+'\nstruct GGOAsgariSeedItem { let s: String; let e: String?; let b: Double; let n: Double }\nstruct GGOEngine {\n    var asgariSeed: [GGOAsgariSeedItem]\n    var yemekIstisnaSeed: [GGOYemekIstisnaItem]\n    var taxBracketsByYear: [Int: [GGOTaxBracket]]\n    var agiByYear: [Int: [String: Double]]\n'+ggo+'\n    func calculate(year: Int, brut: Double, medeni: String, damgaBinde: Double, nakdi: [Double], yemek: [Double], ayni: [Double], minimum: Bool) -> [GGOMonthData] { buildGgoMonthData(year: year, brut: brut, medeni: medeni, damgaBinde: damgaBinde, nakdiAylik: nakdi, yemekAylik: yemek, ayniAylik: ayni, minimumMode: minimum) }\n    func reverse(year: Int, targetNet: Double, targetMonth: Int, medeni: String, damgaBinde: Double) -> [String: Double] {\n'+reverse+'\n        return ["brut": foundBrut, "net": foundNet]\n    }\n}\nextension Array { subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil } }\n')
manifest = {'source': 'https://github.com/gokhanyilmaz7-tech/AKTUER', 'files': {str(p.relative_to(native)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [core_path,views_path,native/'AKTUER/AppFormatters.swift']}, 'method': 'Swift calculation bodies copied unchanged; Codable input and request-scoped data adapter added.'}
(target.parent/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Native Core and GGO extracted with source hashes.')
