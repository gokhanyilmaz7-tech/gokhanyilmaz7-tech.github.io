import Foundation

// Each calculation runs in a separate process. There is no cross-user mutable memory.
enum TechnicalTable: String { case asgariUcret, yasalFaiz, yasamTablolari, tuikIlkEvlenmeYasi }
enum TechnicalDataSeedData {
    static var data: [String: [[String: String]]] = [:]
    static func rows(for table: TechnicalTable) -> [[String: String]] { data[table.rawValue] ?? [] }
}
enum ParametersSyncService {
    enum Domain { case aktuerya }
    struct Bundle { var parameterMap: [String: String] }
    static let shared = Service()
    struct Service { func cachedBundle(for domain: Domain) -> Bundle? { nil } }
}

struct EngineRequest: Decodable {
    var input: IGTInputSnapshot?
    var ggo: GGORequest?
    var data: [String: [[String: String]]]
}
struct GGORequest: Decodable {
    var year: Int
    var brut: Double
    var medeni: String
    var nakdi: [Double]
    var yemek: [Double]
    var ayni: [Double]
    var minimum: Bool
    var targetNet: Double?
    var targetMonth: Int?
}

func number(_ s: String?) -> Double { AppFormatters.parseNumber(s ?? "") ?? 0 }

extension GGOEngine {
    init(data: [String: [[String: String]]]) {
        asgariSeed = (data["asgariUcret"] ?? []).map { GGOAsgariSeedItem(s: $0["baslangic"] ?? "", e: $0["bitis"], b: number($0["brut"]), n: number($0["net"])) }
        yemekIstisnaSeed = (data["gelirVergisiYemekIstisnasi"] ?? []).map { GGOYemekIstisnaItem(s: $0["baslangic"] ?? "", e: $0["bitis"] ?? "", gunluk: number($0["gunluk"]), aylik: number($0["aylik"])) }
        taxBracketsByYear = [:]
        for row in data["gelirVergisiDilimleri"] ?? [] {
            guard let year = Int(row["yil"] ?? "") else { continue }
            let limit = row["matrah"] == "∞" ? Double.infinity : number(row["matrah"])
            taxBracketsByYear[year, default: []].append(GGOTaxBracket(limit: limit, rate: number(row["oran"]) / 100))
        }
        for key in Array(taxBracketsByYear.keys) { taxBracketsByYear[key]?.sort { $0.limit < $1.limit } }
        agiByYear = [:]
        var rankByYear: [Int: Int] = [:]
        for row in data["agiTablosu"] ?? [] {
            guard let year = Int(row["yil"] ?? "") else { continue }
            let rank = (row["donem"] ?? "").contains("Mayıs") ? 2 : 1
            if rank < rankByYear[year, default: 0] { continue }
            rankByYear[year] = rank
            var value = ["bekar": number(row["bekar"]), "evli": number(row["evli_es_c_yok"])]
            for i in 1...5 { value["evli_\(i)"] = number(row["evli_es_c_yok_\(i)"] ?? row["evli_es_c_yok_4"]) }
            agiByYear[year] = value
        }
    }
}

func stampRate(year: Int, data: [String: [[String: String]]]) -> Double {
    for row in data["damgaVergisi"] ?? [] {
        if year >= (Int(row["baslangic_yili"] ?? "") ?? 0), year <= (Int(row["bitis_yili"] ?? "") ?? 0) { return number(row["oran_binde"]) }
    }
    return 0
}
