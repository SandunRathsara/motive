import ExpoModulesCore
import Foundation

public class MotiveRecordDirectoryModule: Module {
  private func directoryURL() throws -> URL {
    // Resolving the path must not create the record or change an existing database.
    let support = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask,
      appropriateFor: nil, create: false
    )
    return support.appendingPathComponent("Motive", isDirectory: true)
  }

  public func definition() -> ModuleDefinition {
    Name("MotiveRecordDirectory")

    AsyncFunction("directory") { () -> String in
      return try self.directoryURL().absoluteString
    }

    AsyncFunction("directoryExists") { () -> Bool in
      do {
        _ = try FileManager.default.attributesOfItem(atPath: self.directoryURL().path)
        return true
      } catch let error as NSError {
        if error.domain == NSCocoaErrorDomain &&
          (error.code == NSFileNoSuchFileError || error.code == NSFileReadNoSuchFileError) {
          return false
        }
        // Permissions and I/O failures must not be mistaken for successful erasure.
        throw error
      }
    }

    AsyncFunction("prepareDirectory") { () -> Void in
      var directory = try self.directoryURL()
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
      guard try directory.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup == true else {
        throw NSError(domain: "MotiveRecordDirectory", code: 1)
      }
    }
  }
}
