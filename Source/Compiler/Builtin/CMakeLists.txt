include("${CMAKE_SOURCE_DIR}/CMake/convert_hltxt_to_hl.cmake")

convert_hltxt_to_hl(
    TARGET Generate_builtin
    OUTPUT_DIRECTORY "${CMAKE_CURRENT_LIST_DIR}"
    TEXT_FILES
    "${CMAKE_CURRENT_LIST_DIR}/Builtin.hltxt"
    )
    
set(BUILTIN_HL_FILE_PATH "${CMAKE_CURRENT_LIST_DIR}/Builtin.hl" PARENT_SCOPE)
