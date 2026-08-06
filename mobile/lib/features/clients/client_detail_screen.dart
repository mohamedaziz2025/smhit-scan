import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class ClientDetailScreen extends StatelessWidget {
  final String clientId;
  const ClientDetailScreen({super.key, required this.clientId});

  @override
  Widget build(BuildContext context) {
    return PlaceholderScreen(
      title: 'Client #$clientId',
      icon: Icons.apartment_outlined,
      moduleNote: 'Fiches & rapports du client, filtres période — Module 7/8.',
    );
  }
}
