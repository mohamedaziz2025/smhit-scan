// Smoke test — vérifie que l'app démarre et affiche le formulaire de connexion.
// apiHealthProvider est surchargé pour rester hermétique (pas d'appel réseau
// réel dans un test unitaire) ; la connectivité live est vérifiée manuellement
// via le badge de l'écran de connexion sur le serveur de test déployé.
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';

import 'package:smhit_mobile/core/network/api_client.dart';
import 'package:smhit_mobile/main.dart';

void main() {
  // Hive a besoin d'un répertoire réel même en test unitaire (pas de
  // path_provider disponible hors intégration) — un dossier temporaire suffit.
  setUpAll(() => Hive.init(Directory.systemTemp.createTempSync('smhit_test_').path));

  testWidgets('affiche le formulaire de connexion au démarrage', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiHealthProvider.overrideWith((ref) async => true)],
        child: const SmhitApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('SMHIT'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Email'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Mot de passe'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.text('API connectée'), findsOneWidget);
  });
}
