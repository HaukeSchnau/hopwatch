// A thin bridge to Apple's on-device language model (Foundation Models, iOS 26+).
// JavaScript owns the prompt and the vocabulary: it passes the fields to fill, each
// optionally constrained to a list of choices, and gets back one string per field.

import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

struct FieldSpec: Record {
  @Field var name: String = ""
  @Field var description: String = ""
  /// When set, the model can only answer with one of these strings.
  @Field var choices: [String]? = nil
}

struct GenerateOptions: Record {
  @Field var instructions: String = ""
  @Field var prompt: String = ""
  @Field var fields: [FieldSpec] = []
}

final class ModelUnavailableException: Exception {
  override var reason: String {
    "Apple's on-device language model isn't available on this device"
  }
}

public class OnDeviceModelModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OnDeviceModel")

    AsyncFunction("availability") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        switch SystemLanguageModel.default.availability {
        case .available:
          return "available"
        case .unavailable(let reason):
          switch reason {
          case .deviceNotEligible: return "deviceNotEligible"
          case .appleIntelligenceNotEnabled: return "appleIntelligenceNotEnabled"
          case .modelNotReady: return "modelNotReady"
          @unknown default: return "unsupported"
          }
        @unknown default:
          return "unsupported"
        }
      }
      #endif
      return "unsupported"
    }

    AsyncFunction("generate") { (options: GenerateOptions) async throws -> [String: String] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        guard case .available = SystemLanguageModel.default.availability else {
          throw ModelUnavailableException()
        }
        return try await generate(options)
      }
      #endif
      throw ModelUnavailableException()
    }
  }
}

#if canImport(FoundationModels)
/// Builds a schema at runtime from the requested fields, so the answer always parses and
/// constrained fields only contain allowed values.
@available(iOS 26.0, *)
private func generate(_ options: GenerateOptions) async throws -> [String: String] {
  let properties = options.fields.map { field in
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
  let session = LanguageModelSession(instructions: options.instructions)
  let response = try await session.respond(to: options.prompt, schema: schema)
  var answer: [String: String] = [:]
  for field in options.fields {
    answer[field.name] = try response.content.value(String.self, forProperty: field.name)
  }
  return answer
}
#endif
