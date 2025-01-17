/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/rxjs-tslint-rules
 */
/*tslint:disable:no-use-before-declare*/

import * as Lint from "tslint";
import * as tsutils from "tsutils";
import * as ts from "typescript";

import { UsedWalker } from "../support/used-walker";

export class Rule extends Lint.Rules.TypedRule {
  public static metadata: Lint.IRuleMetadata = {
    description: "Disallows the use of banned operators.",
    options: {
      type: "object"
    },
    optionsDescription: Lint.Utils.dedent`
      An object containing keys that are names of operators
      and values that are either booleans or strings containing the explanation for the ban.`,
    requiresTypeInfo: true,
    ruleName: "rxjs-ban-operators",
    type: "functionality",
    typescriptOnly: true
  };

  public static FAILURE_STRING = "RxJS operator is banned";

  public applyWithProgram(
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): Lint.RuleFailure[] {
    return this.applyWithWalker(
      new Walker(sourceFile, this.getOptions(), program)
    );
  }
}

class Walker extends UsedWalker {
  private _bans: { explanation: string; regExp: RegExp }[] = [];

  constructor(
    sourceFile: ts.SourceFile,
    rawOptions: Lint.IOptions,
    program: ts.Program
  ) {
    super(sourceFile, rawOptions, program);

    const [options] = this.getOptions();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== false) {
          this._bans.push({
            explanation: typeof value === "string" ? value : "",
            regExp: new RegExp(`^${key}$`)
          });
        }
      });
    }
  }

  public visitImportDeclaration(node: ts.ImportDeclaration): void {
    const moduleSpecifier = node.moduleSpecifier.getText();
    // console.log("moduleSpecifier", moduleSpecifier);
    // '@acutmore/rxjs'
    if (/^['"]@acutmore\/rxjs?/.test(moduleSpecifier)) {
      // console.log("   moduleSpecifier matched", moduleSpecifier);
      if (tsutils.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(binding => {
          // console.log("      binding", binding);
          if (binding.propertyName) {
            console.log("binding.propertyName ", name);
          }
          this.validateNode(binding.propertyName || binding.name);
        });
      }
    } else {
      const match = moduleSpecifier.match(
        /^['"]@acutmore\/rxjs\/add\/operator\/(\w+)['"]/
      );
      if (match) {
        const failure = this.getFailure(match[1]);
        if (failure) {
          this.addFailureAtNode(node.moduleSpecifier, failure);
        }
      }
    }

    super.visitImportDeclaration(node);
  }

  protected onSourceFileEnd(): void {
    Object.entries(this.usedOperators).forEach(([key, value]) => {
      const failure = this.getFailure(key);
      if (failure) {
        value.forEach(node => this.addFailureAtNode(node, failure));
      }
    });
  }

  private getFailure(name: string): string | undefined {
    // console.log("name", name);
    // if (name.indexOf("do") !== -1) {
    //   console.log("do---", name);
    // }
    const { _bans } = this;
    for (let b = 0, length = _bans.length; b < length; ++b) {
      const ban = _bans[b];
      if (ban.regExp.test(name)) {
        const explanation = ban.explanation ? `: ${ban.explanation}` : "";
        console.log(" fail, ", explanation);
        return `${Rule.FAILURE_STRING}: ${name}${explanation}`;
      }
    }
    return undefined;
  }

  private validateNode(name: ts.Node): void {
    const failure = this.getFailure(name.getText());
    if (failure) {
      this.addFailureAtNode(name, failure);
    }
  }
}
