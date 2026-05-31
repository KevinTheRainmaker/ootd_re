import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

final closetTheme = ThemeData(
  useMaterial3: true,
  colorScheme: const ColorScheme.light(
    primary: Colors.black,
    onPrimary: Colors.white,
    surface: Color(0xFFFDF8F8),
    onSurface: Colors.black,
  ),
  scaffoldBackgroundColor: const Color(0xFFFDF8F8),
  textTheme: GoogleFonts.montserratTextTheme(),
  appBarTheme: AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: Colors.black,
    elevation: 0,
    titleTextStyle: GoogleFonts.montserrat(
      fontSize: 18,
      fontWeight: FontWeight.w700,
      color: Colors.black,
      letterSpacing: 2,
    ),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Colors.white,
    selectedItemColor: Colors.black,
    unselectedItemColor: Color(0xFF999999),
    showSelectedLabels: false,
    showUnselectedLabels: false,
    elevation: 0,
    type: BottomNavigationBarType.fixed,
  ),
  cardTheme: const CardTheme(
    color: Colors.white,
    elevation: 2,
    shadowColor: Color(0x1A000000),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(8)),
    ),
  ),
);
