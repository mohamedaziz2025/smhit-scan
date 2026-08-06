import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Écran-gabarit pour les modules pas encore implémentés (squelette Module 1).
/// Chaque écran métier réel remplace ce widget au fil des modules 6/8 (§14).
class PlaceholderScreen extends StatelessWidget {
  final String title;
  final String moduleNote;
  final IconData icon;

  const PlaceholderScreen({
    super.key,
    required this.title,
    required this.moduleNote,
    this.icon = Icons.construction_outlined,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: SmhitColors.bgGradient),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: SmhitColors.brandLight,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(icon, size: 30, color: SmhitColors.brand600),
                ),
                const SizedBox(height: 20),
                Text(title, style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text(
                  moduleNote,
                  style: const TextStyle(color: SmhitColors.muted, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
