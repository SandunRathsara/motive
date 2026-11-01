Pod::Spec.new do |s|
  s.name = 'MotiveRecordDirectory'
  s.version = '1.0.0'
  s.summary = 'Backup-excluded Application Support directory for the local record'
  s.description = s.summary
  s.author = 'Motive'
  s.homepage = 'https://github.com/SandunRathsara/motive'
  s.license = { :type => 'MIT' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/SandunRathsara/motive.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.swift_version = '5.9'
  s.source_files = '**/*.{h,m,mm,swift}'
end
