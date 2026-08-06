import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Analytics',
      icon: Icons.insights_outlined,
      moduleNote: 'Tendances, consommation, taux de capture (fl_chart) — Module 7/8.',
    );
  }
}
