require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiveActivityModule'
  s.version        = package['version']
  s.summary        = 'Native ActivityKit Live Activity bridge for Expo'
  s.description    = 'Bridges iOS ActivityKit Live Activities to React Native via Expo Modules API'
  s.license        = 'MIT'
  s.author         = 'mobile-core'
  s.homepage       = 'https://github.com/example/mobile-core'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/example/mobile-core.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
