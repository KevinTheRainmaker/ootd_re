import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:closet/shared/models/ootd_item.dart';
import 'package:closet/shared/utils/mood_colors.dart';

class ItemEditScreen extends StatefulWidget {
  final String imagePath;
  final String originalImageUrl;
  final List<OotdItem> initialItems;

  const ItemEditScreen({
    super.key,
    required this.imagePath,
    required this.originalImageUrl,
    required this.initialItems,
  });

  @override
  State<ItemEditScreen> createState() => _ItemEditScreenState();
}

class _ItemEditScreenState extends State<ItemEditScreen> {
  late List<_EditableItem> _items;
  Mood _selectedMood = Mood.happy;

  static const _categories = ['top', 'bottom', 'outer', 'shoes', 'bag', 'accessory'];
  static const _categoryLabels = {
    'top': '상의',
    'bottom': '하의',
    'outer': '아우터',
    'shoes': '신발',
    'bag': '가방',
    'accessory': '액세서리',
  };

  @override
  void initState() {
    super.initState();
    _items = widget.initialItems
        .map((item) => _EditableItem.fromOotdItem(item))
        .toList();
  }

  void _addItem() {
    setState(() {
      _items.add(_EditableItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        category: 'top',
        brand: '',
        productName: '',
        color: '',
        orderIdx: _items.length,
      ));
    });
  }

  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
      for (int i = 0; i < _items.length; i++) {
        _items[i] = _items[i].copyWith(orderIdx: i);
      }
    });
  }

  List<OotdItem> _buildOotdItems() {
    return _items.asMap().entries.map((entry) {
      final i = entry.key;
      final e = entry.value;
      return OotdItem(
        id: e.id,
        ootdId: '',
        category: e.category,
        brand: e.brand.isEmpty ? null : e.brand,
        productName: e.productName.isEmpty ? null : e.productName,
        color: e.color.isEmpty ? null : e.color,
        orderIdx: i,
      );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'EDIT OUTFIT',
          style: GoogleFonts.montserrat(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 3,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              slivers: [
                // 무드 선택
                SliverToBoxAdapter(
                  child: _MoodSelector(
                    selected: _selectedMood,
                    onSelect: (mood) => setState(() => _selectedMood = mood),
                  ),
                ),
                // 구분선
                const SliverToBoxAdapter(
                  child: Divider(height: 1, thickness: 0.5, color: Color(0xFFE0E0E0)),
                ),
                // 아이템 섹션 헤더
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        Text(
                          'ITEMS',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 3,
                            color: Colors.black54,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${_items.length}개',
                          style: GoogleFonts.montserrat(
                            fontSize: 11,
                            color: Colors.black38,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // 아이템 리스트
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _ItemCard(
                      item: _items[index],
                      categories: _categories,
                      categoryLabels: _categoryLabels,
                      onChanged: (updated) {
                        setState(() => _items[index] = updated);
                      },
                      onDelete: () => _removeItem(index),
                    ),
                    childCount: _items.length,
                  ),
                ),
                // 아이템 추가 버튼
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: OutlinedButton.icon(
                      onPressed: _addItem,
                      icon: const Icon(Icons.add, size: 16, color: Colors.black54),
                      label: Text(
                        '아이템 추가',
                        style: GoogleFonts.montserrat(
                          fontSize: 13,
                          color: Colors.black54,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE0E0E0)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
          ),
          // CTA 버튼
          _CtaButton(
            onPressed: () {
              context.push(
                '/card/generate',
                extra: {
                  'imagePath': widget.imagePath,
                  'originalImageUrl': widget.originalImageUrl,
                  'items': _buildOotdItems(),
                  'mood': _selectedMood.name,
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _MoodSelector extends StatelessWidget {
  final Mood selected;
  final ValueChanged<Mood> onSelect;

  const _MoodSelector({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'MOOD',
            style: GoogleFonts.montserrat(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 3,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: Mood.values.map((mood) {
              final isSelected = mood == selected;
              return GestureDetector(
                onTap: () => onSelect(mood),
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: mood.color,
                        shape: BoxShape.circle,
                        border: isSelected
                            ? Border.all(color: Colors.black, width: 2.5)
                            : Border.all(color: Colors.transparent, width: 2.5),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: mood.color.withValues(alpha: 0.4),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                )
                              ]
                            : null,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      mood.label,
                      style: GoogleFonts.montserrat(
                        fontSize: 10,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                        color: isSelected ? Colors.black : Colors.black45,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  final _EditableItem item;
  final List<String> categories;
  final Map<String, String> categoryLabels;
  final ValueChanged<_EditableItem> onChanged;
  final VoidCallback onDelete;

  const _ItemCard({
    required this.item,
    required this.categories,
    required this.categoryLabels,
    required this.onChanged,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(item.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: Colors.red.shade50,
        child: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 22),
      ),
      onDismissed: (_) => onDelete(),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFEEEEEE)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 카테고리 드롭다운
            DropdownButtonFormField<String>(
              value: item.category,
              decoration: _inputDecoration('카테고리'),
              style: GoogleFonts.montserrat(fontSize: 13, color: Colors.black87),
              items: categories
                  .map((c) => DropdownMenuItem(
                        value: c,
                        child: Text(categoryLabels[c] ?? c),
                      ))
                  .toList(),
              onChanged: (val) {
                if (val != null) onChanged(item.copyWith(category: val));
              },
            ),
            const SizedBox(height: 10),
            // 색상
            TextFormField(
              initialValue: item.color,
              decoration: _inputDecoration('색상 (예: 블랙, 화이트)'),
              style: GoogleFonts.montserrat(fontSize: 13),
              onChanged: (val) => onChanged(item.copyWith(color: val)),
            ),
            const SizedBox(height: 10),
            // 브랜드
            TextFormField(
              initialValue: item.brand,
              decoration: _inputDecoration('브랜드'),
              style: GoogleFonts.montserrat(fontSize: 13),
              onChanged: (val) => onChanged(item.copyWith(brand: val)),
            ),
            const SizedBox(height: 10),
            // 제품명
            TextFormField(
              initialValue: item.productName,
              decoration: _inputDecoration('제품명'),
              style: GoogleFonts.montserrat(fontSize: 13),
              onChanged: (val) => onChanged(item.copyWith(productName: val)),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.montserrat(fontSize: 12, color: Colors.black26),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: Colors.black, width: 1.2),
        ),
        filled: true,
        fillColor: Colors.white,
        isDense: true,
      );
}

class _CtaButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _CtaButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEEEEEE), width: 0.5)),
      ),
      child: GestureDetector(
        onTap: onPressed,
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(26),
          ),
          child: Center(
            child: Text(
              '카드 생성하기',
              style: GoogleFonts.montserrat(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 15,
                letterSpacing: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// 편집 가능한 아이템 로컬 모델
class _EditableItem {
  final String id;
  final String category;
  final String brand;
  final String productName;
  final String color;
  final int orderIdx;

  const _EditableItem({
    required this.id,
    required this.category,
    required this.brand,
    required this.productName,
    required this.color,
    required this.orderIdx,
  });

  factory _EditableItem.fromOotdItem(OotdItem item) => _EditableItem(
        id: item.id,
        category: item.category,
        brand: item.brand ?? '',
        productName: item.productName ?? '',
        color: item.color ?? '',
        orderIdx: item.orderIdx,
      );

  _EditableItem copyWith({
    String? id,
    String? category,
    String? brand,
    String? productName,
    String? color,
    int? orderIdx,
  }) =>
      _EditableItem(
        id: id ?? this.id,
        category: category ?? this.category,
        brand: brand ?? this.brand,
        productName: productName ?? this.productName,
        color: color ?? this.color,
        orderIdx: orderIdx ?? this.orderIdx,
      );
}
