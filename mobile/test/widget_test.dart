// Smoke test — vérifie que l'app démarre et affiche l'écran de connexion.
// apiHealthProvider est surchargé pour rester hermétique (pas d'appel réseau
// réel dans un test unitaire) ; la connectivité live est vérifiée manuellement
// via le badge de l'écran de connexion sur le serveur de test déployé.
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smhit_mobile/core/network/api_client.dart';
import 'package:smhit_mobile/main.dart';

void main() {
  testWidgets('affiche l\'écran de connexion au démarrage', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiHealthProvider.overrideWith((ref) async => true)],
        child: const SmhitApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('SMHIT'), findsOneWidget);
    expect(find.text('Agent'), findsOneWidget);
    expect(find.text('Admin'), findsOneWidget);
    expect(find.text('Super Admin'), findsOneWidget);
    expect(find.text('API connectée'), findsOneWidget);
  });
}
