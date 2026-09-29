// macOS twin of modules/on-device-model: reads the same request JSON from stdin
// ({ instructions, prompt, fields: [{ name, description, choices? }] }), runs it against
// Apple's on-device model on the M1 builder and prints the answer as JSON, with timing on
// stderr. Used by scripts/model.sh to tune prompts without a phone.

import Foundation
import FoundationModels

struct FieldSpec: Decodable {
  let name: String
  let description: String
  let choices: [String]?
}

struct Request: Decodable {
  let instructions: String
  let prompt: String
  let fields: [FieldSpec]
}

@main
struct OnDeviceModelCLI {
  static func main() async throws {
    let request = try JSONDecoder().decode(Request.self, from: FileHandle.standardInput.readDataToEndOfFile())
    guard case .available = SystemLanguageModel.default.availability else {
      FileHandle.standardError.write(Data("model unavailable: \(SystemLanguageModel.default.availability)\n".utf8))
      exit(2)
    }
    let properties = request.fields.map { field in
      DynamicGenerationSchema.Property(
        name: field.name,
        description: field.description,
        schema: field.choices.map { DynamicGenerationSchema(name: "\(field.name)Choice", anyOf: $0) }
          ?? DynamicGenerationSchema(type: String.self)
      )
    }
    let schema = try GenerationSchema(
      root: DynamicGenerationSchema(name: "Answer", properties: properties),
      dependencies: []
    )
    let started = Date()
    let session = LanguageModelSession(instructions: request.instructions)
    let response = try await session.respond(to: request.prompt, schema: schema)
    var answer: [String: String] = [:]
    for field in request.fields {
      answer[field.name] = try response.content.value(String.self, forProperty: field.name)
    }
    let json = try JSONSerialization.data(withJSONObject: answer, options: [.sortedKeys])
    print(String(decoding: json, as: UTF8.self))
    FileHandle.standardError.write(Data(String(format: "%.2fs\n", Date().timeIntervalSince(started)).utf8))
  }
}
