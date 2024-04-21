add_library(H_common)
add_library(H::Common ALIAS H_common)

target_compile_features(H_common PRIVATE cxx_std_23)
target_compile_definitions(H_common PUBLIC "_SCL_SECURE_NO_WARNINGS")

target_sources(H_common PRIVATE
   "Common.cppm"
   "Common.cpp"
)
