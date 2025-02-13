import XCTest
import SwiftTreeSitter
import TreeSitterHlang

final class TreeSitterHlangTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_hlang())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Hlang grammar")
    }
}
