// Smoke test — vérifie que l'app démarre et affiche l'écran de connexion.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smhit_mobile/main.dart';

void main() {
  testWidgets('affiche l\'écran de connexion au démarrage', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SmhitApp()));
    await tester.pumpAndSettle();

    expect(find.text('Se connecter — Agent'), findsOneWidget);
    expect(find.text('Se connecter — Admin'), findsOneWidget);
    expect(find.text('Se connecter — Super Admin'), findsOneWidget);
  });
}
