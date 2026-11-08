import ExpoModulesCore
import Foundation
import HealthKit

public class MotiveHealthKitModule: Module {
  // Only instantiate after the availability check, as required by HealthKit.
  private lazy var healthStore = HKHealthStore()
  private static let signalTypes = ["bodyMass", "sleep", "hrv", "restingHeartRate", "workout"]

  public func definition() -> ModuleDefinition {
    Name("MotiveHealthKit")

    AsyncFunction("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestReadAuthorization") { (promise: Promise) throws in
      try Self.ensureAvailable()
      let readTypes = try Set<HKObjectType>(Self.signalTypes.map { try Self.sampleType($0) })
      self.healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
        guard error == nil, success else {
          promise.reject("E_HEALTHKIT_AUTHORIZATION", "Health access request could not finish.")
          return
        }
        // Success means the request finished, never that read access was granted.
        promise.resolve()
      }
    }

    AsyncFunction("requestStatus") { (type: String, promise: Promise) throws in
      let sampleType = try Self.sampleType(type)
      try Self.ensureAvailable()
      self.healthStore.getRequestStatusForAuthorization(toShare: [], read: [sampleType]) { status, error in
        guard error == nil else {
          promise.reject("E_HEALTHKIT_REQUEST_STATUS", "Health request status is unavailable.")
          return
        }
        switch status {
        case .shouldRequest: promise.resolve("shouldRequest")
        case .unnecessary: promise.resolve("unnecessary")
        case .unknown: promise.resolve("unknown")
        @unknown default: promise.resolve("unknown")
        }
      }
    }

    AsyncFunction("anchoredFetch") { (
      type: String, anchorBase64: String?, startMs: Double?, limit: Int, promise: Promise
    ) throws in
      let sampleType = try Self.sampleType(type)
      try Self.ensureAvailable()
      guard limit > 0, startMs?.isFinite != false else {
        throw Self.failure("E_HEALTHKIT_QUERY_INPUT")
      }
      let anchor = try Self.decodeAnchor(anchorBase64)
      let predicate = startMs.map {
        HKQuery.predicateForSamples(
          withStart: Date(timeIntervalSince1970: $0 / 1000), end: nil, options: .strictStartDate
        )
      }
      // No updateHandler: a one-shot foreground query, with no observer/background delivery.
      let query = HKAnchoredObjectQuery(type: sampleType, predicate: predicate, anchor: anchor, limit: limit) {
        _, samples, deletions, newAnchor, error in
        guard error == nil, let samples, let deletions, let newAnchor else {
          promise.reject("E_HEALTHKIT_QUERY_FAILED", "Health query could not finish.")
          return
        }
        do {
          let encodedAnchor = try NSKeyedArchiver.archivedData(
            withRootObject: newAnchor, requiringSecureCoding: true
          ).base64EncodedString()
          promise.resolve([
            "samples": samples.compactMap { Self.sampleDto($0, type: type) },
            "deletedUuids": deletions.map { $0.uuid.uuidString },
            "anchor": encodedAnchor,
            // HealthKit has no hasMore flag. A full raw page needs another fetch;
            // an exactly-full final page costs one empty fetch. Count before skipping future stages.
            "hasMore": samples.count + deletions.count >= limit
          ] as [String: Any])
        } catch {
          promise.reject("E_HEALTHKIT_ANCHOR", "Health query anchor could not be encoded.")
        }
      }
      self.healthStore.execute(query)
    }
  }

  private static func failure(_ code: String) -> Exception {
    Exception(name: "HealthKitError", description: code, code: code)
  }

  private static func ensureAvailable() throws {
    guard HKHealthStore.isHealthDataAvailable() else { throw failure("E_HEALTHKIT_UNAVAILABLE") }
  }

  private static func sampleType(_ type: String) throws -> HKSampleType {
    let sampleType: HKSampleType?
    switch type {
    case "bodyMass": sampleType = HKObjectType.quantityType(forIdentifier: .bodyMass)
    case "hrv": sampleType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)
    case "restingHeartRate": sampleType = HKObjectType.quantityType(forIdentifier: .restingHeartRate)
    case "sleep": sampleType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
    case "workout": sampleType = HKObjectType.workoutType()
    default: throw failure("E_HEALTHKIT_TYPE")
    }
    guard let sampleType else { throw failure("E_HEALTHKIT_TYPE") }
    return sampleType
  }

  private static func decodeAnchor(_ encoded: String?) throws -> HKQueryAnchor? {
    guard let encoded else { return nil }
    // Never silently restart a backfill on a corrupt/wrong-class anchor.
    do {
      guard let data = Data(base64Encoded: encoded),
        let anchor = try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data) else {
        throw failure("E_HEALTHKIT_ANCHOR")
      }
      return anchor
    } catch {
      throw failure("E_HEALTHKIT_ANCHOR")
    }
  }

  private static func nullable(_ value: String?) -> Any {
    value as Any? ?? NSNull()
  }

  private static func sampleDto(_ sample: HKSample, type: String) -> [String: Any]? {
    let revision = sample.sourceRevision
    let os = revision.operatingSystemVersion
    var dto: [String: Any] = [
      "uuid": sample.uuid.uuidString,
      "type": type,
      "startMs": (sample.startDate.timeIntervalSince1970 * 1000).rounded(),
      "endMs": (sample.endDate.timeIntervalSince1970 * 1000).rounded(),
      "source": ["bundleId": revision.source.bundleIdentifier, "name": revision.source.name],
      "sourceRevision": [
        "version": nullable(revision.version),
        "productType": nullable(revision.productType),
        "osVersion": "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
      ],
      "device": NSNull(),
      "userEntered": (sample.metadata?[HKMetadataKeyWasUserEntered] as? NSNumber)?.boolValue ?? false
    ]
    if let device = sample.device {
      dto["device"] = [
        "model": nullable(device.model),
        "manufacturer": nullable(device.manufacturer),
        "hardwareVersion": nullable(device.hardwareVersion),
        "softwareVersion": nullable(device.softwareVersion),
        "name": nullable(device.name)
      ]
    }
    switch type {
    case "bodyMass", "hrv", "restingHeartRate":
      guard let quantity = sample as? HKQuantitySample else { return nil }
      let (unit, unitLabel): (HKUnit, String)
      switch type {
      case "bodyMass": (unit, unitLabel) = (HKUnit.gramUnit(with: .kilo), "kg")
      case "hrv": (unit, unitLabel) = (HKUnit.secondUnit(with: .milli), "ms")
      default: (unit, unitLabel) = (HKUnit.count().unitDivided(by: HKUnit.minute()), "bpm")
      }
      dto["value"] = quantity.quantity.doubleValue(for: unit)
      dto["unit"] = unitLabel
    case "sleep":
      guard let category = sample as? HKCategorySample else { return nil }
      switch HKCategoryValueSleepAnalysis(rawValue: category.value) {
      case .inBed: dto["stage"] = "inBed"
      case .awake: dto["stage"] = "awake"
      case .asleepCore: dto["stage"] = "asleepCore"
      case .asleepDeep: dto["stage"] = "asleepDeep"
      case .asleepREM: dto["stage"] = "asleepREM"
      case .asleepUnspecified: dto["stage"] = "asleepUnspecified"
      default: return nil // Future stages must not be misclassified as asleep.
      }
    case "workout":
      guard let workout = sample as? HKWorkout else { return nil }
      // Do not read energy, distance, statistics, workout events or routes.
      dto["activityType"] = workout.workoutActivityType.rawValue
    default: return nil
    }
    return dto
  }
}
