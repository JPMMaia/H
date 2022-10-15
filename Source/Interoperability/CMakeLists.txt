add_library(H_c_header_importer)
add_library(H::c_header_importer ALIAS H_c_header_importer)

target_compile_features(H_c_header_importer PUBLIC cxx_std_23)

target_link_libraries(H_c_header_importer PRIVATE H::Core)

## LLVM ##

find_package(Clang CONFIG REQUIRED)
target_include_directories(H_c_header_importer PRIVATE ${CLANG_INCLUDE_DIRS})
target_link_libraries(H_c_header_importer PRIVATE libclang)

## End LLVM ##

target_sources(H_c_header_importer PRIVATE
   "C_header_importer.cppm"
   "C_header_importer.cpp"
)

if(BUILD_TESTING)
   find_file(
      stdio_location
      "stdio.h"
      REQUIRED
   )
   message(STATUS "stdio_location is ${stdio_location}")
   get_filename_component(c_headers_location ${stdio_location} DIRECTORY)
   message(STATUS "c_headers_location is ${c_headers_location}")

   find_package(Vulkan REQUIRED)
   set(vulkan_headers_location "${Vulkan_INCLUDE_DIRS}")
   message(STATUS "vulkan_headers_location is ${vulkan_headers_location}")

   add_executable(H_c_header_importer_tests)
   target_link_libraries(H_c_header_importer_tests PRIVATE H_c_header_importer)

   find_package(Catch2 CONFIG REQUIRED)
   target_link_libraries(H_c_header_importer_tests PRIVATE Catch2::Catch2 Catch2::Catch2WithMain)

   target_compile_definitions(
      H_c_header_importer_tests
      PRIVATE
         C_HEADERS_LOCATION="${c_headers_location}"
         VULKAN_HEADERS_LOCATION="${vulkan_headers_location}"
   )

   target_sources(H_c_header_importer_tests PRIVATE "C_header_importer.tests.cpp")

   include(Catch)
   catch_discover_tests(H_c_header_importer_tests)
endif()