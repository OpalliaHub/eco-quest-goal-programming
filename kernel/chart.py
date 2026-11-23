"""Render the classroom score plot directly from a Python solver trace."""
from xml.etree.ElementTree import Element, SubElement, tostring


def score_chart(result, count, language):
    trace = result['trace']
    if not 1 <= count <= len(trace):
        raise ValueError('step must be within the selected trace.')
    chinese = language == 'zh'
    title = '目标分数如何改善？' if chinese else 'How does the score improve?'
    label = '搜索步骤' if chinese else 'Search step'
    green = '目前最低分' if chinese else 'Lowest so far'
    orange = '可行方案得分' if chinese else 'Feasible score'
    svg = Element('svg', {'xmlns': 'http://www.w3.org/2000/svg',
                          'viewBox': '0 0 640 255', 'role': 'img',
                          'aria-labelledby': 'title desc',
                          'font-family': 'system-ui, sans-serif'})
    SubElement(svg, 'title', id='title').text = title
    visible = trace[:count]
    last = visible[-1]
    last_score = '{:g}'.format(last['bestSoFar'])
    SubElement(svg, 'desc', id='desc').text = '{} {} / {}. {}: {}.'.format(
        label, count, len(trace), green, last_score)
    SubElement(svg, 'rect', width='640', height='255', rx='14', fill='#f6faf7')
    def text(x, y, value, anchor='start', size=13):
        SubElement(svg, 'text', {'x': str(x), 'y': str(y), 'fill': '#203f37',
                                 'text-anchor': anchor, 'font-size': str(size)}).text = str(value)
    def line(x1, y1, x2, y2, color):
        SubElement(svg, 'line', x1=str(x1), y1=str(y1), x2=str(x2), y2=str(y2), stroke=color)
    def px(i):
        return 54 + i * 551.0 / (len(trace) - 1)
    high = max(row['score'] for row in trace if row['feasible']) or 1
    def py(score):
        return 185 - 130.0 * score / high
    text(20, 28, title, size=19)
    text(619, 28, '{} {} / {}'.format(label, count, len(trace)), 'end')
    for value in [0, high / 2.0, high]:
        y = py(value)
        line(54, y, 605, y, '#cfdbd4')
        text(46, y + 4, '{:g}'.format(value), 'end')
    line(54, 55, 54, 185, '#84988d')
    for i in (0, (len(trace)-1)//2, len(trace)-1):
        text(px(i), 204, i+1, 'middle')
    # Horizontal then vertical segments show that the minimum changes only
    # after a specific candidate is judged, not between two integer plans.
    path = []
    for i, row in enumerate(visible):
        if row['bestSoFar'] is not None:
            x, y = px(i), py(row['bestSoFar'])
            path.append(('M{:.2f},{:.2f}' if not path else 'H{:.2f}V{:.2f}').format(x, y))
        if row['feasible']:
            SubElement(svg, 'circle', cx='{:.2f}'.format(px(i)),
                       cy='{:.2f}'.format(py(row['score'])), r='2.4', fill='#ac5a22',
                       attrib={'class': 'candidate'})
    SubElement(svg, 'path', d=' '.join(path), fill='none', stroke='#147368',
               attrib={'stroke-width': '2.8'})
    SubElement(svg, 'circle', cx='{:.2f}'.format(px(count-1)),
               cy='{:.2f}'.format(py(last['bestSoFar'])), r='4', fill='#147368')
    line(38, 231, 62, 231, '#147368')
    text(69, 235, '{}: {}'.format(green, last_score))
    SubElement(svg, 'circle', cx='285', cy='231', r='3', fill='#ac5a22')
    text(298, 235, orange)
    return tostring(svg, encoding='utf-8')
