import Foundation

NSTimeZone.default = TimeZone(identifier: "Europe/Istanbul")!
do {
    let bytes = FileHandle.standardInput.readDataToEndOfFile()
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
        let raw = try decoder.singleValueContainer().decode(String.self)
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "Europe/Istanbul")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        if let date = formatter.date(from: String(raw.prefix(10))) { return date }
        throw DecodingError.dataCorruptedError(in: try decoder.singleValueContainer(), debugDescription: "Geçersiz tarih")
    }
    var request = try decoder.decode(EngineRequest.self, from: bytes)
    TechnicalDataSeedData.data = request.data
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    encoder.outputFormatting = [.sortedKeys]
    let result: Data
    if let ggo = request.ggo {
        let engine = GGOEngine(data: request.data)
        let stamp = stampRate(year: ggo.year, data: request.data)
        if let net = ggo.targetNet {
            result = try encoder.encode(engine.reverse(year: ggo.year, targetNet: net, targetMonth: max(0, min(11,ggo.targetMonth ?? 0)), medeni: ggo.medeni, damgaBinde: stamp))
        } else {
            result = try encoder.encode(engine.calculate(year: ggo.year, brut: ggo.brut, medeni: ggo.medeni, damgaBinde: stamp, nakdi: ggo.nakdi, yemek: ggo.yemek, ayni: ggo.ayni, minimum: ggo.minimum))
        }
    } else if var input = request.input {
        // This table is loaded from the authenticated user's effective data, not from the browser.
        input.dulEsEvlenmeRows = (request.data["dulEsEvlenme"] ?? []).map { DYKTDulEsEvlenmeRow(grup: $0["cocuk_18_alti"] ?? "", aciklama: $0["yas"] ?? "", oran: number($0["oran"])) }
        guard let calculated = IGTEngine.calculate(input: input) else { throw NSError(domain: "Eksik teknik veri", code: 422) }
        result = try encoder.encode(calculated)
    } else { throw NSError(domain: "Hesap girdisi eksik", code: 422) }
    FileHandle.standardOutput.write(result)
} catch {
    // No personal inputs in logs.
    FileHandle.standardError.write(Data("Hesap girdisi veya teknik veri geçersiz: \(error)\n".utf8))
    exit(1)
}
