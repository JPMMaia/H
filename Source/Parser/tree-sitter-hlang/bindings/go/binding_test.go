package tree_sitter_hlang_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_hlang "github.com/jpmmaia/h/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_hlang.Language())
	if language == nil {
		t.Errorf("Error loading Hlang grammar")
	}
}
