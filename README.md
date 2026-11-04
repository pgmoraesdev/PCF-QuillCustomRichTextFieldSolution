# PowerApps PCF Rich Text Component

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A custom **PowerApps PCF Component** that integrates the [Quill Rich Text Editor](https://quilljs.com/) into your PowerApps apps.  
It allows rich text editing with formatting options like bold, italic, underline, bullet lists, and more.

**Installation:** Download from Releases section or from bin/Release/

## Reset do editor (versão 1.0.3)

Importe a solução gerenciada [QuillRichTextField_1_0_3_managed.zip](bin/Release/QuillRichTextField_1_0_3_managed.zip)
no mesmo ambiente do aplicativo. No Power Apps Studio, atualize o componente de
código para a versão disponível (salve e reabra o aplicativo se necessário).
O controle mantém a mesma identidade e suas propriedades anteriores.

O reset usa uma nova propriedade numérica de entrada, **`ResetKey`**. Sempre que
seu valor muda, o editor restaura o **`Default` atual**, publica o resultado em
**`HtmlText`** e limpa o histórico de desfazer/refazer. Se `Default` estiver vazio,
o editor e `HtmlText` ficam vazios. Cada instância acompanha sua própria chave.

Exemplo em Power Fx com separadores pt-BR:

1. Na propriedade `Default` do PCF, configure o HTML inicial ou o campo do registro.
2. Na propriedade `ResetKey` do PCF, coloque:

   ```powerfx
   Coalesce(varResetQuill; 0)
   ```

3. No `OnSelect` do botão de limpar/restaurar, coloque:

   ```powerfx
   Set(varResetQuill; Coalesce(varResetQuill; 0) + 1)
   ```

Cada clique incrementa a chave e restaura o valor padrão, mesmo quando `Default`
não mudou. Não é necessário inicializar a variável. Para limpar o campo, use
`Default = ""`. Para restaurar o conteúdo de um registro, mantenha esse conteúdo
em `Default`. Use variáveis diferentes para resetar editores independentemente;
compartilhe uma variável se quiser resetar vários juntos.

Em ambientes com separadores em inglês, as fórmulas são
`Coalesce(varResetQuill, 0)` e
`Set(varResetQuill, Coalesce(varResetQuill, 0) + 1)`.

Não use `Set(varResetQuill; 1)` repetidamente: a chave precisa **mudar** a cada
pedido. Atualizações de layout/cores e chamadas subsequentes com a mesma chave
preservam a digitação. Mudanças de `Default` continuam sendo aplicadas e mudanças
na configuração da barra de ferramentas também preservam as edições.

`Reset(NomeDoPCF)` não é a interface implementada. O ciclo de vida documentado de
[StandardControl](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/control)
não expõe um callback de reset. Uma propriedade de entrada, processada em
`updateView`, permite solicitar esse comportamento explicitamente pelo Power Fx.
Esta alteração não adiciona reset automático por `ResetForm`.

### Código e geração do pacote

Este repositório originalmente contém a solução e o JavaScript compilado, mas
não o projeto TypeScript PCF referenciado pelo projeto MSBuild. O módulo do
controle foi recuperado do pacote original e está em
[control/CustomRichTextField.js](control/CustomRichTextField.js), com o manifesto
em [control/ControlManifest.xml](control/ControlManifest.xml).

Para gerar a solução atualizada, execute no PowerShell:

```powershell
./scripts/build.ps1
```

O script usa o ZIP original como base, preservando as bibliotecas Quill, os estilos,
as licenças e os demais arquivos. Substitui apenas o módulo do controle dentro do
bundle, o manifesto (controle 0.0.2) e a versão da solução (1.0.3). O ZIP original
permanece disponível. Este é o processo de build desta alteração; o projeto
MSBuild original ainda depende do projeto PCF externo ausente.

Para validar o código e o pacote gerado (requer Node.js):

```powershell
node --test tests/reset.test.cjs
./tests/check-package.ps1
```

Os testes automatizados usam um substituto de Quill para verificar o ciclo de
vida PCF, resets repetidos, saída vazia, mudanças de Default, preservação de edições,
histórico, isolamento entre instâncias e notificações reentrantes. A validação do
ZIP verifica os metadados, os arquivos preservados, a sintaxe do bundle completo
e executa os mesmos testes no módulo efetivamente empacotado.

Validação final no Studio: digite sobre o Default, acione o botão várias vezes,
confira `NomeDoPCF.HtmlText`, tente Ctrl+Z depois do reset e repita com `Default`
vazio e com HTML formatado. A importação e execução no Power Apps precisam ser
validadas no ambiente de destino.

<img src="screenshots/QillRTE1.png" alt="Quill Custom Rich Text Editor For PowerApps" height="180px"> <img src="screenshots/QuillRTE2.png" alt="Quill Custom Rich Text Editor For PowerApps" height="180px">


## ✨ Features
📝 Rich Text Editing Capabilities
* **WYSIWYG Editor**: Full-featured rich text editing with real-time preview
* **HTML Output**: Generates clean HTML that can be stored and processed
* **Font Support**: Multiple font families including Arial, Times New Roman, Comic Sans, and more
* **Text Formatting**: Bold, italic, underline, strikethrough, and color options
* **Advanced Features**: Links, blockquotes, code blocks, and image insertion
* **Lists**: Ordered and unordered list support
* **Text** Alignment: Left, center, right, and justify alignment options

🎨 Extensive Visual Customization
* **Toolbar Styling**: Customizable background, text, and icon colors
* **Editor Styling**: Configurable background and border colors
* **Individual Border Control**: Separate color control for all 4 sides of both toolbar and editor
* **Dropdown Theming**: Custom colors for heading, font, and alignment dropdowns
* **Professional Defaults**: Clean white backgrounds with modern #444 text/icons

⚙️ Flexible Configuration Options
* **Toolbar Toggles**: Show/hide any toolbar button or feature
    * Bold, Italic, Underline formatting
    * Link and image insertion
    * List and alignment tools
    * Font family and color pickers
    * Code blocks and blockquotes
    * Clean formatting button
* **Heading Levels**: Configurable heading options (H1, H2, H3, etc.)
* **Color Exclusions**: Color picker dropdowns maintain default Quill styling for usability

## Property Categories
### Input Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `Default` | SingleLine.Text | No | - | Initial value for the rich text input (similar to standard text input) |
| `ResetKey` | Whole.None | No | `0` | Change this number to restore the current Default and clear undo/redo history |
| `headingLevels` | SingleLine.Text | No | - | Comma-separated heading levels to show (e.g. 1,2,3) |

### Color Customization Properties

#### Editor Styling
| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `editorBackgroundColor` | SingleLine.Text | No | `#ffffff` | Background color of the editing area |
| `editorBorderColor` | SingleLine.Text | No | `#ccc` | General border color for the editor |
| `editorBorderTopColor` | SingleLine.Text | No | - | Top border color (overrides general border color) |
| `editorBorderRightColor` | SingleLine.Text | No | - | Right border color (overrides general border color) |
| `editorBorderBottomColor` | SingleLine.Text | No | - | Bottom border color (overrides general border color) |
| `editorBorderLeftColor` | SingleLine.Text | No | - | Left border color (overrides general border color) |

#### Toolbar Styling
| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `toolbarColor` | SingleLine.Text | No | `#ffffff` | Background color of the toolbar |
| `toolbarTextColor` | SingleLine.Text | No | `#444444` | Color of toolbar text elements |
| `toolbarIconColor` | SingleLine.Text | No | `#444444` | Color of toolbar icons |
| `toolbarBorderTopColor` | SingleLine.Text | No | - | Top border color of the toolbar |
| `toolbarBorderRightColor` | SingleLine.Text | No | - | Right border color of the toolbar |
| `toolbarBorderBottomColor` | SingleLine.Text | No | - | Bottom border color of the toolbar |
| `toolbarBorderLeftColor` | SingleLine.Text | No | - | Left border color of the toolbar |

#### Dropdown Styling
| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `toolbarDropdownColor` | SingleLine.Text | No | `#ffffff` | Background color for heading, font, and alignment dropdowns |
| `toolbarDropdownTextColor` | SingleLine.Text | No | `#333333` | Text color for dropdown elements |

### Feature Toggle Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `showBold` | TwoOptions | No | `true` | Show/hide bold formatting button |
| `showItalic` | TwoOptions | No | `true` | Show/hide italic formatting button |
| `showUnderline` | TwoOptions | No | `true` | Show/hide underline formatting button |
| `showLink` | TwoOptions | No | `true` | Show/hide link insertion button |
| `showBlockquote` | TwoOptions | No | `true` | Show/hide blockquote button |
| `showCodeBlock` | TwoOptions | No | `true` | Show/hide code block button |
| `showImage` | TwoOptions | No | `true` | Show/hide image insertion button |
| `showOrderedList` | TwoOptions | No | `true` | Show/hide ordered list button |
| `showBulletList` | TwoOptions | No | `true` | Show/hide bullet list button |
| `showFont` | TwoOptions | No | `true` | Show/hide font family dropdown |
| `showColor` | TwoOptions | No | `true` | Show/hide text and background color pickers |
| `showAlign` | TwoOptions | No | `true` | Show/hide text alignment options |
| `showClean` | TwoOptions | No | `true` | Show/hide clean formatting button |

### Output Properties

| Property | Type | Required | Hidden | Description |
|----------|------|----------|--------|-------------|
| `HtmlText` | SingleLine.Text | No | Yes | Live HTML output from the editor (available for formulas and flows) |

## Color Value Format

All color properties accept standard CSS color values:
- **Hex Colors**: `#ffffff`, `#444444`, `#ff0000`
- **RGB Colors**: `rgb(255, 255, 255)`, `rgba(255, 0, 0, 0.5)`
- **Named Colors**: `white`, `black`, `red`, `blue`
- **HSL Colors**: `hsl(120, 100%, 50%)`

---

## 📜 License

This project is licensed under the **MIT License** – see the [LICENSE](./LICENSE) file for details.  

It also uses third-party libraries such as **Quill** (Rich Text Editor), which are licensed separately under their own terms.  
See [NOTICE.md](./NOTICE.md) for more information.
