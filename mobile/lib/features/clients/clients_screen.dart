import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class ClientsScreen extends StatelessWidget {
  const ClientsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Clients',
      icon: Icons.apartment_outlined,
      moduleNote: 'Liste + recherche clients (parité web §10) — Module 7/8.',
    );
  }
}
